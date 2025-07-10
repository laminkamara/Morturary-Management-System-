import express from 'express';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get overview statistics
router.get('/overview', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const [bodiesStats, autopsiesStats, tasksStats, releasesStats, storageStats] = await Promise.all([
      // Bodies statistics
      query(`
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_count,
          COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_count,
          AVG(age) as average_age
        FROM bodies 
        ${dateFilter}
        GROUP BY status
      `, params),

      // Autopsies statistics
      query(`
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(CASE WHEN completed_date IS NOT NULL THEN 1 END) as completed_count
        FROM autopsies 
        ${dateFilter}
        GROUP BY status
      `, params),

      // Tasks statistics
      query(`
        SELECT 
          status,
          priority,
          COUNT(*) as count
        FROM tasks 
        ${dateFilter}
        GROUP BY status, priority
      `, params),

      // Releases statistics
      query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM body_releases 
        ${dateFilter}
        GROUP BY status
      `, params),

      // Storage statistics
      query(`
        SELECT 
          type,
          status,
          COUNT(*) as count
        FROM storage_units 
        GROUP BY type, status
      `)
    ]);

    res.json({
      bodies: bodiesStats.rows,
      autopsies: autopsiesStats.rows,
      tasks: tasksStats.rows,
      releases: releasesStats.rows,
      storage: storageStats.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get bodies report
router.get('/bodies', async (req, res, next) => {
  try {
    const { startDate, endDate, status, gender } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (startDate && endDate) {
      paramCount += 2;
      whereClause += ` AND created_at BETWEEN $${paramCount-1} AND $${paramCount}`;
      params.push(startDate, endDate);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (gender) {
      paramCount++;
      whereClause += ` AND gender = $${paramCount}`;
      params.push(gender);
    }

    const result = await query(`
      SELECT 
        b.*,
        s.name as storage_name,
        s.location as storage_location,
        u.name as registered_by_name
      FROM bodies b
      LEFT JOIN storage_units s ON b.storage_id = s.id
      LEFT JOIN users u ON b.registered_by = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get autopsies report
router.get('/autopsies', async (req, res, next) => {
  try {
    const { startDate, endDate, status, pathologistId } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (startDate && endDate) {
      paramCount += 2;
      whereClause += ` AND a.created_at BETWEEN $${paramCount-1} AND $${paramCount}`;
      params.push(startDate, endDate);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (pathologistId) {
      paramCount++;
      whereClause += ` AND a.pathologist_id = $${paramCount}`;
      params.push(pathologistId);
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

// Get tasks report
router.get('/tasks', async (req, res, next) => {
  try {
    const { startDate, endDate, status, priority, assignedTo } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (startDate && endDate) {
      paramCount += 2;
      whereClause += ` AND t.created_at BETWEEN $${paramCount-1} AND $${paramCount}`;
      params.push(startDate, endDate);
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

    if (assignedTo) {
      paramCount++;
      whereClause += ` AND t.assigned_to = $${paramCount}`;
      params.push(assignedTo);
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
      ORDER BY t.due_date DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get releases report
router.get('/releases', async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (startDate && endDate) {
      paramCount += 2;
      whereClause += ` AND r.created_at BETWEEN $${paramCount-1} AND $${paramCount}`;
      params.push(startDate, endDate);
    }

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

// Get storage utilization report
router.get('/storage', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        s.type,
        s.status,
        COUNT(*) as count,
        ROUND(
          (COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM storage_units WHERE type = s.type)::NUMERIC) * 100, 
          2
        ) as percentage
      FROM storage_units s
      GROUP BY s.type, s.status
      ORDER BY s.type, s.status
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get performance metrics (admin only)
router.get('/performance', requireRole(['admin']), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const [
      avgAutopsyTime,
      taskCompletionRate,
      releaseProcessingTime,
      storageUtilization
    ] = await Promise.all([
      // Average autopsy completion time
      query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (completed_date - scheduled_date))/3600) as avg_hours
        FROM autopsies 
        WHERE status = 'completed' AND completed_date IS NOT NULL
        ${dateFilter ? 'AND ' + dateFilter : ''}
      `, params),

      // Task completion rate
      query(`
        SELECT 
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100 as completion_rate
        FROM tasks 
        ${dateFilter}
      `, params),

      // Average release processing time
      query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (approved_date - requested_date))/3600) as avg_hours
        FROM body_releases 
        WHERE status IN ('approved', 'completed') AND approved_date IS NOT NULL
        ${dateFilter ? 'AND ' + dateFilter : ''}
      `, params),

      // Storage utilization
      query(`
        SELECT 
          COUNT(CASE WHEN status = 'occupied' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100 as utilization_rate
        FROM storage_units
      `)
    ]);

    res.json({
      avgAutopsyTime: avgAutopsyTime.rows[0].avg_hours,
      taskCompletionRate: taskCompletionRate.rows[0].completion_rate,
      releaseProcessingTime: releaseProcessingTime.rows[0].avg_hours,
      storageUtilization: storageUtilization.rows[0].utilization_rate
    });
  } catch (error) {
    next(error);
  }
});

export default router;