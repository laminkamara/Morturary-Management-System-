import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Get all storage units
router.get('/', async (req, res, next) => {
  try {
    const { status, type } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND s.type = $${paramCount}`;
      params.push(type);
    }

    const result = await query(`
      SELECT 
        s.*,
        b.full_name as assigned_body_name,
        b.tag_id as assigned_body_tag
      FROM storage_units s
      LEFT JOIN bodies b ON s.assigned_body_id = b.id
      ${whereClause}
      ORDER BY s.name
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get storage unit by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        s.*,
        b.full_name as assigned_body_name,
        b.tag_id as assigned_body_tag,
        b.age as assigned_body_age,
        b.gender as assigned_body_gender
      FROM storage_units s
      LEFT JOIN bodies b ON s.assigned_body_id = b.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Storage unit not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update storage unit status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // If setting to available or maintenance, clear assigned body
    const assignedBodyId = status === 'occupied' ? undefined : null;

    const result = await query(`
      UPDATE storage_units 
      SET status = $1, assigned_body_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, assignedBodyId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Storage unit not found' });
    }

    // Emit real-time update
    req.app.get('io').emit('storageUpdated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get storage statistics
router.get('/stats/capacity', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        type,
        COUNT(*) as total_units,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_units,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_units,
        ROUND(
          (SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
          2
        ) as capacity_percentage
      FROM storage_units 
      GROUP BY type
      
      UNION ALL
      
      SELECT 
        'total' as type,
        COUNT(*) as total_units,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_units,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_units,
        ROUND(
          (SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
          2
        ) as capacity_percentage
      FROM storage_units
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get available storage units
router.get('/available/list', async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let whereClause = "WHERE status = 'available'";
    const params = [];

    if (type) {
      whereClause += ' AND type = $1';
      params.push(type);
    }

    const result = await query(`
      SELECT id, name, type, location, temperature
      FROM storage_units
      ${whereClause}
      ORDER BY name
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;