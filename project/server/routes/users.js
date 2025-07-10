import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', requireRole(['admin']), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, name, email, role, phone, status, last_login, created_at
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(`
      SELECT id, name, email, role, phone, status, last_login, created_at
      FROM users 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create user (admin only)
router.post('/', requireRole(['admin']), validate(schemas.createUser), async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const userId = uuidv4();

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await query(`
      INSERT INTO users (id, name, email, password_hash, role, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, phone, status, created_at
    `, [userId, name, email, passwordHash, role, phone]);

    // Emit real-time update
    req.app.get('io').emit('userCreated', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', validate(schemas.updateUser), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Users can only update their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Non-admin users cannot change role or status
    if (req.user.role !== 'admin') {
      delete updates.role;
      delete updates.status;
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const values = [id, ...Object.values(updates)];

    const result = await query(`
      UPDATE users 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, phone, status, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Emit real-time update
    req.app.get('io').emit('userUpdated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cannot delete self
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Emit real-time update
    req.app.get('io').emit('userDeleted', { id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', requireRole(['admin']), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count
      FROM users 
      GROUP BY role
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;