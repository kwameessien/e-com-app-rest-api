const express = require('express');
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category_id, search } = req.query;
    let query = `
      SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.category_id,
             p.image_url, p.is_active, p.created_at, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    const params = [];
    let paramIndex = 1;

    if (category_id) {
      query += ` AND p.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (search && search.trim()) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ products: result.rows });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1 AND is_active = true', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const result = await pool.query(
      `SELECT r.id, r.user_id, r.rating, r.comment, r.created_at,
              u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('Reviews list error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const ratingNum = rating === undefined ? null : parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1 AND is_active = true', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
       RETURNING id, user_id, product_id, rating, comment, created_at`,
      [req.user.id, id, ratingNum, comment ? String(comment).trim() : null]
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    console.error('Review create/update error:', err);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.price, p.stock_quantity, p.category_id,
              p.image_url, p.is_active, p.created_at, p.updated_at, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    if (!product.is_active) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (err) {
    console.error('Product get error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, stock_quantity, category_id, image_url } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'price must be a valid non-negative number' });
    }

    const stock = stock_quantity ?? 0;
    if (isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) {
      return res.status(400).json({ error: 'stock_quantity must be a valid non-negative integer' });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock_quantity, category_id, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, price, stock_quantity, category_id, image_url, is_active, created_at`,
      [
        name.trim(),
        description?.trim() || null,
        parseFloat(price),
        parseInt(stock, 10),
        category_id || null,
        image_url?.trim() || null
      ]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid category_id' });
    }
    console.error('Product create error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, category_id, image_url, is_active } = req.body;

    const existing = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const fields = [
      { key: 'name', value: name, fn: (v) => (typeof v === 'string' && v.trim() ? v.trim() : null) },
      { key: 'description', value: description, fn: (v) => (v !== undefined ? (v?.trim?.() || null) : null) },
      { key: 'price', value: price, fn: (v) => (v !== undefined && !isNaN(parseFloat(v)) && parseFloat(v) >= 0 ? parseFloat(v) : null) },
      { key: 'stock_quantity', value: stock_quantity, fn: (v) => (v !== undefined && !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0 ? parseInt(v, 10) : null) },
      { key: 'category_id', value: category_id, fn: (v) => (v !== undefined ? (v || null) : null) },
      { key: 'image_url', value: image_url, fn: (v) => (v !== undefined ? (v?.trim?.() || null) : null) },
      { key: 'is_active', value: is_active, fn: (v) => {
        if (v === undefined) return null;
        if (v === true || v === 1) return true;
        if (v === false || v === 0) return false;
        if (typeof v === 'string') {
          const s = v.toLowerCase().trim();
          if (['false', '0', 'no', ''].includes(s)) return false;
          if (['true', '1', 'yes'].includes(s)) return true;
        }
        return Boolean(v);
      } }
    ];

    for (const { key, value, fn } of fields) {
      if (value !== undefined) {
        const parsed = fn(value);
        if (parsed !== null || key === 'description' || key === 'category_id' || key === 'image_url') {
          updates.push(`${key} = $${paramIndex}`);
          values.push(parsed);
          paramIndex++;
        }
      }
    }

    if (updates.length === 0) {
      const result = await pool.query(
        'SELECT id, name, description, price, stock_quantity, category_id, image_url, is_active, created_at, updated_at FROM products WHERE id = $1',
        [id]
      );
      return res.json({ product: result.rows[0] });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, price, stock_quantity, category_id, image_url, is_active, created_at, updated_at`,
      values
    );

    res.json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid category_id' });
    }
    console.error('Product update error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deactivated', product: result.rows[0] });
  } catch (err) {
    console.error('Product delete error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
