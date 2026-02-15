const express = require('express');
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { parent_id } = req.query;
    let query = 'SELECT id, name, parent_id, created_at FROM categories';
    const params = [];

    if (parent_id !== undefined) {
      if (parent_id === '' || parent_id === 'null') {
        query += ' WHERE parent_id IS NULL';
      } else {
        query += ' WHERE parent_id = $1';
        params.push(parent_id);
      }
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Categories list error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const categoryResult = await pool.query(
      'SELECT id, name, parent_id, created_at FROM categories WHERE id = $1',
      [id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = categoryResult.rows[0];

    const childrenResult = await pool.query(
      'SELECT id, name, parent_id, created_at FROM categories WHERE parent_id = $1 ORDER BY name ASC',
      [id]
    );

    res.json({
      category: {
        ...category,
        children: childrenResult.rows,
      },
    });
  } catch (err) {
    console.error('Category get error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (parent_id !== undefined && parent_id !== null) {
      const parent = await pool.query('SELECT id FROM categories WHERE id = $1', [parent_id]);
      if (parent.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent_id' });
      }
    }

    const result = await pool.query(
      `INSERT INTO categories (name, parent_id)
       VALUES ($1, $2)
       RETURNING id, name, parent_id, created_at`,
      [name.trim(), parent_id || null]
    );

    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid parent_id' });
    }
    console.error('Category create error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }

    if (parent_id !== undefined) {
      if (parent_id !== null) {
        const parent = await pool.query('SELECT id FROM categories WHERE id = $1', [parent_id]);
        if (parent.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid parent_id' });
        }
        if (parseInt(parent_id, 10) === parseInt(id, 10)) {
          return res.status(400).json({ error: 'Category cannot be its own parent' });
        }
      }
      updates.push(`parent_id = $${paramIndex}`);
      values.push(parent_id || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      const result = await pool.query(
        'SELECT id, name, parent_id, created_at FROM categories WHERE id = $1',
        [id]
      );
      return res.json({ category: result.rows[0] });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE categories SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, parent_id, created_at`,
      values
    );

    res.json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid parent_id' });
    }
    console.error('Category update error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted', category: result.rows[0] });
  } catch (err) {
    console.error('Category delete error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
