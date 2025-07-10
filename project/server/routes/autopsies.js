import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get all autopsies
router.get('/', async (req, res, next) => {
  try {
    const { status, pathologistId } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Filter by pathologist for non-admin users
    if (req.user.role === 'pathologist') {
      paramCount++;
      whereClause += ` AND a.pathologist_id = $${paramCount}`;
      params.push(req.user.id);
    } else if (pathologistId) {
      paramCount++;
      whereClause += ` AND a.pathologist_id = $${paramCount}`;
      params.push(pathologistId);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    const result = await query(`
      SELECT 
        a.*,
        b.full_name as body_name,
        b.tag_id as body_tag_id,
        b.age as body_age,
        b.gender as body_gender,
        p.name as pathologist_name,
        ab.name as assigned_by_name
      FROM autopsies a
      JOIN bodies b ON a.body_id = b.id
      JOIN users p ON a.pathologist_id = p.id
      JOIN users ab ON a.assigned_by = ab.id
      ${whereClause}
      ORDER BY a.scheduled_date DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get autopsy by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        a.*,
        b.full_name as body_name,
        b.tag_id as body_tag_id,
        b.age as body_age,
        b.gender as body_gender,
        b.date_of_death,
        p.name as pathologist_name,
        p.email as pathologist_email,
        ab.name as assigned_by_name
      FROM autopsies a
      JOIN bodies b ON a.body_id = b.id
      JOIN users p ON a.pathologist_id = p.id
      JOIN users ab ON a.assigned_by = ab.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Autopsy not found' });
    }

    // Check access permissions
    const autopsy = result.rows[0];
    if (req.user.role === 'pathologist' && autopsy.pathologist_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(autopsy);
  } catch (error) {
    next(error);
  }
});

// Create autopsy (admin only)
router.post('/', requireRole(['admin']), validate(schemas.createAutopsy), async (req, res, next) => {
  try {
    const { bodyId, pathologistId, scheduledDate, notes } = req.body;
    const autopsyId = uuidv4();

    const result = await transaction(async (client) => {
      // Insert autopsy
      const autopsyResult = await client.query(`
        INSERT INTO autopsies (id, body_id, pathologist_id, scheduled_date, notes, assigned_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [autopsyId, bodyId, pathologistId, scheduledDate, notes, req.user.id]);

      // Update body status
      await client.query(`
        UPDATE bodies 
        SET status = 'autopsy_scheduled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bodyId]);

      return autopsyResult.rows[0];
    });

    // Get body and pathologist info for notifications
    const bodyResult = await query('SELECT full_name, tag_id FROM bodies WHERE id = $1', [bodyId]);
    const pathologistResult = await query('SELECT name FROM users WHERE id = $1', [pathologistId]);

    // Create notification for pathologist
    const notificationId = uuidv4();
    await query(`
      INSERT INTO notifications (id, title, message, type, user_id, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      notificationId,
      'Autopsy Scheduled',
      `Autopsy scheduled for ${bodyResult.rows[0].full_name} on ${new Date(scheduledDate).toLocaleDateString()}`,
      'info',
      pathologistId,
      '/autopsies'
    ]);

    // Emit real-time updates
    req.app.get('io').emit('autopsyCreated', result);
    req.app.get('io').emit('bodyUpdated', { id: bodyId, status: 'autopsy_scheduled' });
    req.app.get('io').to(pathologistId).emit('newNotification', {
      id: notificationId,
      title: 'Autopsy Scheduled',
      message: `Autopsy scheduled for ${bodyResult.rows[0].full_name} on ${new Date(scheduledDate).toLocaleDateString()}`,
      type: 'info'
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Update autopsy
router.put('/:id', validate(schemas.updateAutopsy), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user can update this autopsy
    const autopsyCheck = await query('SELECT pathologist_id FROM autopsies WHERE id = $1', [id]);
    if (autopsyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Autopsy not found' });
    }

    if (req.user.role === 'pathologist' && autopsyCheck.rows[0].pathologist_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add completion date if status is being set to completed
    if (updates.status === 'completed') {
      updates.completed_date = new Date().toISOString();
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updates)];

    const result = await transaction(async (client) => {
      // Update autopsy
      const autopsyResult = await client.query(`
        UPDATE autopsies 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, values);

      // Update body status if autopsy is completed
      if (updates.status === 'completed') {
        await client.query(`
          UPDATE bodies 
          SET status = 'autopsy_completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT body_id FROM autopsies WHERE id = $1)
        `, [id]);
      }

      return autopsyResult.rows[0];
    });

    // Create notification for admin if autopsy is completed
    if (updates.status === 'completed') {
      const bodyResult = await query(`
        SELECT b.full_name, b.tag_id 
        FROM bodies b 
        JOIN autopsies a ON b.id = a.body_id 
        WHERE a.id = $1
      `, [id]);

      const notificationId = uuidv4();
      await query(`
        INSERT INTO notifications (id, title, message, type, user_id, action_url)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        notificationId,
        'Autopsy Completed',
        `Autopsy for ${bodyResult.rows[0].full_name} has been completed`,
        'success',
        'admin-1',
        '/autopsies'
      ]);

      req.app.get('io').to('admin-1').emit('newNotification', {
        id: notificationId,
        title: 'Autopsy Completed',
        message: `Autopsy for ${bodyResult.rows[0].full_name} has been completed`,
        type: 'success'
      });
    }

    // Emit real-time updates
    req.app.get('io').emit('autopsyUpdated', result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Delete autopsy (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Get autopsy info
      const autopsyResult = await client.query('SELECT body_id FROM autopsies WHERE id = $1', [id]);
      
      if (autopsyResult.rows.length === 0) {
        throw new Error('Autopsy not found');
      }

      const bodyId = autopsyResult.rows[0].body_id;

      // Delete autopsy
      await client.query('DELETE FROM autopsies WHERE id = $1', [id]);

      // Update body status back to registered
      await client.query(`
        UPDATE bodies 
        SET status = 'registered', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bodyId]);

      return { bodyId };
    });

    // Emit real-time updates
    req.app.get('io').emit('autopsyDeleted', { id });
    req.app.get('io').emit('bodyUpdated', { id: result.bodyId, status: 'registered' });

    res.json({ message: 'Autopsy deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get autopsy statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN pathologist_id = $1 THEN 1 END) as my_count
      FROM autopsies 
      GROUP BY status
      
      UNION ALL
      
      SELECT 
        'total' as status,
        COUNT(*) as count,
        COUNT(CASE WHEN pathologist_id = $1 THEN 1 END) as my_count
      FROM autopsies
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;