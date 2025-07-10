import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get all bodies
router.get('/', async (req, res, next) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND b.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (b.full_name ILIKE $${paramCount} OR b.tag_id ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    paramCount++;
    const limitClause = `LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    const offsetClause = `OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await query(`
      SELECT 
        b.*,
        s.name as storage_name,
        s.type as storage_type,
        s.location as storage_location,
        u.name as registered_by_name
      FROM bodies b
      LEFT JOIN storage_units s ON b.storage_id = s.id
      LEFT JOIN users u ON b.registered_by = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
      ${limitClause} ${offsetClause}
    `, params);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM bodies b
      ${whereClause}
    `, params.slice(0, -2)); // Remove limit and offset params

    res.json({
      bodies: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

// Get body by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        b.*,
        s.name as storage_name,
        s.type as storage_type,
        s.location as storage_location,
        s.temperature as storage_temperature,
        u.name as registered_by_name
      FROM bodies b
      LEFT JOIN storage_units s ON b.storage_id = s.id
      LEFT JOIN users u ON b.registered_by = u.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Body not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create body
router.post('/', validate(schemas.createBody), async (req, res, next) => {
  try {
    const bodyData = req.body;
    const bodyId = uuidv4();

    // Generate tag ID
    const year = new Date().getFullYear();
    const tagResult = await query(`
      SELECT COALESCE(MAX(
        CAST(SUBSTRING(tag_id FROM 7) AS INTEGER)
      ), 0) + 1 as next_number
      FROM bodies 
      WHERE tag_id LIKE $1
    `, [`MT${year}%`]);

    const nextNumber = tagResult.rows[0].next_number;
    const tagId = `MT${year}${nextNumber.toString().padStart(4, '0')}`;

    const result = await transaction(async (client) => {
      // Insert body
      const bodyResult = await client.query(`
        INSERT INTO bodies (
          id, tag_id, full_name, age, gender, date_of_death, intake_time,
          storage_id, next_of_kin_name, next_of_kin_relationship, 
          next_of_kin_phone, next_of_kin_address, registered_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        bodyId, tagId, bodyData.fullName, bodyData.age, bodyData.gender,
        bodyData.dateOfDeath, bodyData.intakeTime, bodyData.storageId,
        bodyData.nextOfKinName, bodyData.nextOfKinRelationship,
        bodyData.nextOfKinPhone, bodyData.nextOfKinAddress,
        req.user.id, bodyData.notes
      ]);

      // Update storage unit status
      await client.query(`
        UPDATE storage_units 
        SET status = 'occupied', assigned_body_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [bodyId, bodyData.storageId]);

      return bodyResult.rows[0];
    });

    // Create notification for admin
    const notificationId = uuidv4();
    await query(`
      INSERT INTO notifications (id, title, message, type, user_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      notificationId,
      'New Body Registration',
      `New body registered: ${bodyData.fullName} (${tagId})`,
      'info',
      'admin-1'
    ]);

    // Emit real-time updates
    req.app.get('io').emit('bodyCreated', result);
    req.app.get('io').emit('storageUpdated', { id: bodyData.storageId, status: 'occupied' });
    req.app.get('io').to('admin-1').emit('newNotification', {
      id: notificationId,
      title: 'New Body Registration',
      message: `New body registered: ${bodyData.fullName} (${tagId})`,
      type: 'info'
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Update body
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.tag_id;
    delete updates.registered_by;
    delete updates.created_at;

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const values = [id, ...Object.values(updates)];

    const result = await query(`
      UPDATE bodies 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Body not found' });
    }

    // Emit real-time update
    req.app.get('io').emit('bodyUpdated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete body
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Get body info before deletion
      const bodyResult = await client.query('SELECT * FROM bodies WHERE id = $1', [id]);
      
      if (bodyResult.rows.length === 0) {
        throw new Error('Body not found');
      }

      const body = bodyResult.rows[0];

      // Free up storage unit
      if (body.storage_id) {
        await client.query(`
          UPDATE storage_units 
          SET status = 'available', assigned_body_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [body.storage_id]);
      }

      // Delete body
      await client.query('DELETE FROM bodies WHERE id = $1', [id]);

      return body;
    });

    // Emit real-time updates
    req.app.get('io').emit('bodyDeleted', { id });
    if (result.storage_id) {
      req.app.get('io').emit('storageUpdated', { 
        id: result.storage_id, 
        status: 'available',
        assigned_body_id: null 
      });
    }

    res.json({ message: 'Body deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get body statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_count,
        COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_count,
        COUNT(CASE WHEN gender = 'other' THEN 1 END) as other_count,
        AVG(age) as average_age
      FROM bodies 
      GROUP BY status
      
      UNION ALL
      
      SELECT 
        'total' as status,
        COUNT(*) as count,
        COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_count,
        COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_count,
        COUNT(CASE WHEN gender = 'other' THEN 1 END) as other_count,
        AVG(age) as average_age
      FROM bodies
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;