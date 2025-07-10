import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get all releases
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    const result = await query(`
      SELECT 
        r.*,
        b.full_name as body_name,
        b.tag_id as body_tag_id,
        b.age as body_age,
        b.gender as body_gender,
        rb.name as requested_by_name,
        ab.name as approved_by_name
      FROM body_releases r
      JOIN bodies b ON r.body_id = b.id
      JOIN users rb ON r.requested_by = rb.id
      LEFT JOIN users ab ON r.approved_by = ab.id
      ${whereClause}
      ORDER BY r.requested_date DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get release by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        r.*,
        b.full_name as body_name,
        b.tag_id as body_tag_id,
        b.age as body_age,
        b.gender as body_gender,
        b.date_of_death,
        b.storage_id,
        rb.name as requested_by_name,
        rb.email as requested_by_email,
        ab.name as approved_by_name
      FROM body_releases r
      JOIN bodies b ON r.body_id = b.id
      JOIN users rb ON r.requested_by = rb.id
      LEFT JOIN users ab ON r.approved_by = ab.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Release request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create release request
router.post('/', validate(schemas.createRelease), async (req, res, next) => {
  try {
    const { bodyId, receiverName, receiverId, relationship, notes } = req.body;
    const releaseId = uuidv4();

    const result = await query(`
      INSERT INTO body_releases (id, body_id, receiver_name, receiver_id, relationship, requested_by, requested_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
      RETURNING *
    `, [releaseId, bodyId, receiverName, receiverId, relationship, req.user.id, notes]);

    // Get body info for notification
    const bodyResult = await query('SELECT full_name, tag_id FROM bodies WHERE id = $1', [bodyId]);

    // Create notification for admin
    const notificationId = uuidv4();
    await query(`
      INSERT INTO notifications (id, title, message, type, user_id, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      notificationId,
      'New Release Request',
      `Release request submitted for ${bodyResult.rows[0].full_name} (${bodyResult.rows[0].tag_id})`,
      'info',
      'admin-1',
      '/releases'
    ]);

    // Emit real-time updates
    req.app.get('io').emit('releaseCreated', result.rows[0]);
    req.app.get('io').to('admin-1').emit('newNotification', {
      id: notificationId,
      title: 'New Release Request',
      message: `Release request submitted for ${bodyResult.rows[0].full_name} (${bodyResult.rows[0].tag_id})`,
      type: 'info'
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update release status (admin only)
router.put('/:id/status', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved' || status === 'rejected') {
      updateData.approved_by = req.user.id;
      updateData.approved_date = new Date().toISOString();
    }

    if (notes) {
      updateData.notes = notes;
    }

    const result = await transaction(async (client) => {
      // Update release
      const releaseResult = await client.query(`
        UPDATE body_releases 
        SET status = $1, approved_by = $2, approved_date = $3, notes = COALESCE($4, notes), updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [status, updateData.approved_by, updateData.approved_date, notes, id]);

      // If completed, update body status and free storage
      if (status === 'completed') {
        const bodyResult = await client.query('SELECT storage_id FROM bodies WHERE id = $1', [releaseResult.rows[0].body_id]);
        
        await client.query(`
          UPDATE bodies 
          SET status = 'released', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [releaseResult.rows[0].body_id]);

        if (bodyResult.rows[0].storage_id) {
          await client.query(`
            UPDATE storage_units 
            SET status = 'available', assigned_body_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [bodyResult.rows[0].storage_id]);
        }
      }

      return releaseResult.rows[0];
    });

    // Get release details for notification
    const releaseDetails = await query(`
      SELECT r.*, b.full_name, b.tag_id, rb.name as requested_by_name
      FROM body_releases r
      JOIN bodies b ON r.body_id = b.id
      JOIN users rb ON r.requested_by = rb.id
      WHERE r.id = $1
    `, [id]);

    const release = releaseDetails.rows[0];

    // Create notification for requester
    const notificationId = uuidv4();
    const notificationMessage = status === 'approved' 
      ? `Release request for ${release.full_name} has been approved`
      : status === 'rejected'
      ? `Release request for ${release.full_name} has been rejected`
      : `Release for ${release.full_name} has been completed`;

    await query(`
      INSERT INTO notifications (id, title, message, type, user_id, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      notificationId,
      'Release Status Update',
      notificationMessage,
      status === 'approved' || status === 'completed' ? 'success' : 'warning',
      release.requested_by,
      '/releases'
    ]);

    // Emit real-time updates
    req.app.get('io').emit('releaseUpdated', result);
    req.app.get('io').to(release.requested_by).emit('newNotification', {
      id: notificationId,
      title: 'Release Status Update',
      message: notificationMessage,
      type: status === 'approved' || status === 'completed' ? 'success' : 'warning'
    });

    if (status === 'completed') {
      req.app.get('io').emit('bodyUpdated', { id: release.body_id, status: 'released' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Delete release request (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM body_releases WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Release request not found' });
    }

    // Emit real-time update
    req.app.get('io').emit('releaseDeleted', { id });

    res.json({ message: 'Release request deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get release statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN requested_by = $1 THEN 1 END) as my_count
      FROM body_releases 
      GROUP BY status
      
      UNION ALL
      
      SELECT 
        'total' as status,
        COUNT(*) as count,
        COUNT(CASE WHEN requested_by = $1 THEN 1 END) as my_count
      FROM body_releases
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;