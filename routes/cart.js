const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.product_id, c.quantity, c.created_at,
              p.name, p.price, p.image_url, p.stock_quantity
       FROM cart_items c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1 AND p.is_active = true
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      quantity: row.quantity,
      created_at: row.created_at,
      product: {
        name: row.name,
        price: row.price,
        image_url: row.image_url,
        stock_quantity: row.stock_quantity,
      },
    }));

    res.json({ cart: items });
  } catch (err) {
    console.error('Cart get error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/items', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || quantity === undefined) {
      return res.status(400).json({ error: 'product_id and quantity are required' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const product = await pool.query(
      'SELECT id, stock_quantity FROM products WHERE id = $1 AND is_active = true',
      [product_id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const stock = product.rows[0].stock_quantity;
    const existing = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [req.user.id, product_id]
    );

    const newQuantity = existing.rows.length > 0
      ? existing.rows[0].quantity + qty
      : qty;

    if (newQuantity > stock) {
      return res.status(400).json({
        error: `Not enough stock. Available: ${stock}`,
        stock_quantity: stock,
      });
    }

    let item;
    if (existing.rows.length > 0) {
      const updateResult = await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING id, product_id, quantity, created_at',
        [newQuantity, existing.rows[0].id]
      );
      item = updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1, $2, $3)
         RETURNING id, product_id, quantity, created_at`,
        [req.user.id, product_id, qty]
      );
      item = insertResult.rows[0];
    }

    res.status(201).json({ item });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error('Cart add error:', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.patch('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'quantity is required' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const existing = await pool.query(
      'SELECT c.id, c.product_id, c.quantity, p.stock_quantity FROM cart_items c JOIN products p ON c.product_id = p.id WHERE c.id = $1 AND c.user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (qty > existing.rows[0].stock_quantity) {
      return res.status(400).json({
        error: `Not enough stock. Available: ${existing.rows[0].stock_quantity}`,
        stock_quantity: existing.rows[0].stock_quantity,
      });
    }

    const result = await pool.query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3
       RETURNING id, product_id, quantity, created_at`,
      [qty, id, req.user.id]
    );

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Cart update error:', err);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

router.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Cart remove error:', err);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

router.delete('/', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    res.status(204).send();
  } catch (err) {
    console.error('Cart clear error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
