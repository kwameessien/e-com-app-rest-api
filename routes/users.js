const express = require('express');
const pool = require('../db');
const { authenticateToken, requireSelfOrAdmin, requireSelf } = require('../middleware/auth');

const router = express.Router();

router.get('/:id/addresses', authenticateToken, requireSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, user_id, type, street, city, state, postal_code, country, is_default, created_at FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC',
      [id]
    );
    res.json({ addresses: result.rows });
  } catch (err) {
    console.error('Addresses list error:', err);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

router.post('/:id/addresses', authenticateToken, requireSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, street, city, state, postal_code, country, is_default } = req.body;

    if (!street || typeof street !== 'string' || !street.trim()) {
      return res.status(400).json({ error: 'street is required' });
    }
    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'city is required' });
    }
    if (!postal_code || typeof postal_code !== 'string' || !postal_code.trim()) {
      return res.status(400).json({ error: 'postal_code is required' });
    }
    if (!country || typeof country !== 'string' || !country.trim()) {
      return res.status(400).json({ error: 'country is required' });
    }

    const validTypes = ['shipping', 'billing', 'both'];
    const addressType = type || 'both';
    if (!validTypes.includes(addressType)) {
      return res.status(400).json({ error: 'type must be shipping, billing, or both' });
    }

    const boolDefault = is_default === true || is_default === 'true' || is_default === 1 || is_default === '1';

    const result = await pool.query(
      `INSERT INTO addresses (user_id, type, street, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, type, street, city, state, postal_code, country, is_default, created_at`,
      [
        id,
        addressType,
        street.trim(),
        city.trim(),
        state ? String(state).trim() : null,
        postal_code.trim(),
        country.trim(),
        boolDefault,
      ]
    );

    res.status(201).json({ address: result.rows[0] });
  } catch (err) {
    console.error('Address create error:', err);
    res.status(500).json({ error: 'Failed to create address' });
  }
});

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
