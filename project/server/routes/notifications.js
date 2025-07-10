import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';

const router = express.Router();

// Get user notifications
router.get('/', async (req, res, next) => {
  try {
    const { read, type, limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.id];
    let paramCount = 1;

    if (read !== undefined) {
      paramCount++;
      whereClause += ` AND is_read = $${paramCount}`;
      params.push(read === 'true');
    }

    if (type) {
      paramCount++;
      whereClause += ` AND type = $${paramCount}`;
      params.push(type);
    }

    paramCount++;
    const limitClause = `LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    const offsetClause = `OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await query(`
      SELECT *
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      ${limitClause} ${offsetClause}
    `, params);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM notifications
      ${whereClause}
    `, params.slice(0, -2)); // Remove limit and offset params

    res.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread/count', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `, [req.user.id]);

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Emit real-time update
    req.app.get('io').to(req.user.id).emit('notificationRead', { id });

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res, next) => {
  try {
    const result = await query(`
      UPDATE notifications 
      SET is_read = true, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
      RETURNING id
    `, [req.user.id]);

    // Emit real-time update
    req.app.get('io').to(req.user.id).emit('allNotificationsRead');

    res.json({ 
      message: 'All notifications marked as read',
      count: result.rows.length 
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Emit real-time update
    req.app.get('io').to(req.user.id).emit('notificationDeleted', { id });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Create notification (admin only)
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, message, type, userId, actionUrl } = req.body;
    const notificationId = uuidv4();

    const result = await query(`
      INSERT INTO notifications (id, title, message, type, user_id, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [notificationId, title, message, type, userId, actionUrl]);

    // Emit real-time update
    req.app.get('io').to(userId).emit('newNotification', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;