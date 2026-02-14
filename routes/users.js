const express = require('express');
const pool = require('../db');
const { authenticateToken, requireSelfOrAdmin, requireSelf } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('User get error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/:id', authenticateToken, requireSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(first_name?.trim?.() || null);
      paramIndex++;
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(last_name?.trim?.() || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      const result = await pool.query(
        'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      return res.json({ user: result.rows[0] });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, first_name, last_name, role, created_at, updated_at`,
      values
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({
        error: 'Cannot delete user with existing orders. Contact support.',
      });
    }
    console.error('User delete error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
