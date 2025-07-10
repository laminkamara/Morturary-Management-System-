import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get all tasks
router.get('/', async (req, res, next) => {
  try {
    const { status, priority, assignedTo, type } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Filter by assigned user for non-admin users
    if (req.user.role !== 'admin') {
      paramCount++;
      whereClause += ` AND t.assigned_to = $${paramCount}`;
      params.push(req.user.id);
    } else if (assignedTo) {
      paramCount++;
      whereClause += ` AND t.assigned_to = $${paramCount}`;
      params.push(assignedTo);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      whereClause += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND t.type = $${paramCount}`;
      params.push(type);
    }

    const result = await query(`
      SELECT 
        t.*,
        at.name as assigned_to_name,
        ab.name as assigned_by_name,
        b.full_name as body_name,
        b.tag_id as body_tag_id
      FROM tasks t
      JOIN users at ON t.assigned_to = at.id
      JOIN users ab ON t.assigned_by = ab.id
      LEFT JOIN bodies b ON t.body_id = b.id
      ${whereClause}
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        t.due_date ASC
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        t.*,
        at.name as assigned_to_name,
        at.email as assigned_to_email,
        ab.name as assigned_by_name,
        b.full_name as body_name,
        b.tag_id as body_tag_id
      FROM tasks t
      JOIN users at ON t.assigned_to = at.id
      JOIN users ab ON t.assigned_by = ab.id
      LEFT JOIN bodies b ON t.body_id = b.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check access permissions
    const task = result.rows[0];
    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create task (admin only)
router.post('/', requireRole(['admin']), validate(schemas.createTask), async (req, res, next) => {
  try {
    const { title, description, type, assignedTo, dueDate, priority, bodyId } = req.body;
    const taskId = uuidv4();

    const result = await query(`
      INSERT INTO tasks (id, title, description, type, assigned_to, assigned_by, due_date, priority, body_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [taskId, title, description, type, assignedTo, req.user.id, dueDate, priority, bodyId]);

    // Get assigned user info for notification
    const userResult = await query('SELECT name FROM users WHERE id = $1', [assignedTo]);

    // Create notification for assigned user
    const notificationId = uuidv4();
    await query(`
      INSERT INTO notifications (id, title, message, type, user_id, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      notificationId,
      'New Task Assigned',
      `You have been assigned a new task: ${title}`,
      'info',
      assignedTo,
      '/tasks'
    ]);

    // Emit real-time updates
    req.app.get('io').emit('taskCreated', result.rows[0]);
    req.app.get('io').to(assignedTo).emit('newNotification', {
      id: notificationId,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${title}`,
      type: 'info'
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user can update this task
    const taskCheck = await query('SELECT assigned_to, assigned_by FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskCheck.rows[0];
    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Non-admin users can only update status and add notes
    if (req.user.role !== 'admin') {
      const allowedFields = ['status'];
      Object.keys(updates).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updates[key];
        }
      });
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const values = [id, ...Object.values(updates)];

    const result = await query(`
      UPDATE tasks 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);

    // Create notification for admin if task is completed by staff
    if (updates.status === 'completed' && req.user.role !== 'admin') {
      const taskResult = await query('SELECT title FROM tasks WHERE id = $1', [id]);
      
      const notificationId = uuidv4();
      await query(`
        INSERT INTO notifications (id, title, message, type, user_id, action_url)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        notificationId,
        'Task Completed',
        `Task "${taskResult.rows[0].title}" has been completed by ${req.user.name}`,
        'success',
        task.assigned_by,
        '/tasks'
      ]);

      req.app.get('io').to(task.assigned_by).emit('newNotification', {
        id: notificationId,
        title: 'Task Completed',
        message: `Task "${taskResult.rows[0].title}" has been completed by ${req.user.name}`,
        type: 'success'
      });
    }

    // Emit real-time update
    req.app.get('io').emit('taskUpdated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete task (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Emit real-time update
    req.app.get('io').emit('taskDeleted', { id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get task statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        status,
        priority,
        COUNT(*) as count,
        COUNT(CASE WHEN assigned_to = $1 THEN 1 END) as my_count
      FROM tasks 
      GROUP BY status, priority
      
      UNION ALL
      
      SELECT 
        'total' as status,
        'all' as priority,
        COUNT(*) as count,
        COUNT(CASE WHEN assigned_to = $1 THEN 1 END) as my_count
      FROM tasks
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get overdue tasks
router.get('/overdue/list', async (req, res, next) => {
  try {
    let whereClause = "WHERE t.due_date < CURRENT_TIMESTAMP AND t.status != 'completed'";
    const params = [];

    // Filter by assigned user for non-admin users
    if (req.user.role !== 'admin') {
      whereClause += ' AND t.assigned_to = $1';
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        t.*,
        at.name as assigned_to_name,
        ab.name as assigned_by_name,
        b.full_name as body_name,
        b.tag_id as body_tag_id
      FROM tasks t
      JOIN users at ON t.assigned_to = at.id
      JOIN users ab ON t.assigned_by = ab.id
      LEFT JOIN bodies b ON t.body_id = b.id
      ${whereClause}
      ORDER BY t.due_date ASC
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;