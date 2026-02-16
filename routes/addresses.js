const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, street, city, state, postal_code, country, is_default } = req.body;

    const existing = await pool.query(
      'SELECT id, user_id, type, street, city, state, postal_code, country, is_default FROM addresses WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const address = existing.rows[0];
    if (address.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own addresses' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const validTypes = ['shipping', 'billing', 'both'];
    if (type !== undefined) {
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'type must be shipping, billing, or both' });
      }
      updates.push(`type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }

    if (street !== undefined) {
      if (typeof street !== 'string' || !street.trim()) {
        return res.status(400).json({ error: 'street must be a non-empty string' });
      }
      updates.push(`street = $${paramIndex}`);
      values.push(street.trim());
      paramIndex++;
    }

    if (city !== undefined) {
      if (typeof city !== 'string' || !city.trim()) {
        return res.status(400).json({ error: 'city must be a non-empty string' });
      }
      updates.push(`city = $${paramIndex}`);
      values.push(city.trim());
      paramIndex++;
    }

    if (state !== undefined) {
      updates.push(`state = $${paramIndex}`);
      values.push(state === null || state === '' ? null : String(state).trim());
      paramIndex++;
    }

    if (postal_code !== undefined) {
      if (typeof postal_code !== 'string' || !postal_code.trim()) {
        return res.status(400).json({ error: 'postal_code must be a non-empty string' });
      }
      updates.push(`postal_code = $${paramIndex}`);
      values.push(postal_code.trim());
      paramIndex++;
    }

    if (country !== undefined) {
      if (typeof country !== 'string' || !country.trim()) {
        return res.status(400).json({ error: 'country must be a non-empty string' });
      }
      updates.push(`country = $${paramIndex}`);
      values.push(country.trim());
      paramIndex++;
    }

    if (is_default !== undefined) {
      const boolVal = is_default === true || is_default === 'true' || is_default === 1 || is_default === '1';
      updates.push(`is_default = $${paramIndex}`);
      values.push(boolVal);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.json({ address: existing.rows[0] });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE addresses SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, user_id, type, street, city, state, postal_code, country, is_default, created_at`,
      values
    );

    res.json({ address: result.rows[0] });
  } catch (err) {
    console.error('Address update error:', err);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id, user_id FROM addresses WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own addresses' });
    }

    await pool.query('DELETE FROM addresses WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Address delete error:', err);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

module.exports = router;
