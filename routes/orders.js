const express = require('express');
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT id, user_id, shipping_address_id, billing_address_id, status,
             subtotal, tax, shipping_cost, total, notes, created_at
      FROM orders
      WHERE user_id = $1
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Orders list error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT o.id, o.user_id, o.shipping_address_id, o.billing_address_id, o.status,
              o.subtotal, o.tax, o.shipping_cost, o.total, o.notes, o.created_at
       FROM orders o
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const itemsResult = await pool.query(
      `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
              p.name AS product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      order: {
        ...order,
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    console.error('Order get error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { shipping_address_id, billing_address_id, notes } = req.body;
    const userId = req.user.id;

    const cartResult = await client.query(
      `SELECT c.id, c.product_id, c.quantity, p.price, p.stock_quantity, p.name
       FROM cart_items c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1 AND p.is_active = true`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    for (const row of cartResult.rows) {
      if (row.quantity > row.stock_quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${row.name}. Available: ${row.stock_quantity}`,
          product_id: row.product_id,
        });
      }
    }

    if (shipping_address_id) {
      const addr = await client.query(
        'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
        [shipping_address_id, userId]
      );
      if (addr.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid shipping_address_id' });
      }
    }
    if (billing_address_id) {
      const addr = await client.query(
        'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
        [billing_address_id, userId]
      );
      if (addr.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid billing_address_id' });
      }
    }

    await client.query('BEGIN');
    transactionStarted = true;

    let subtotal = 0;
    const orderItems = cartResult.rows.map((row) => {
      const unitPrice = parseFloat(row.price);
      const totalPrice = unitPrice * row.quantity;
      subtotal += totalPrice;
      return {
        product_id: row.product_id,
        quantity: row.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
    });

    const tax = 0;
    const shippingCost = 0;
    const total = subtotal + tax + shippingCost;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, shipping_address_id, billing_address_id, status, subtotal, tax, shipping_cost, total, notes)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8)
       RETURNING id, user_id, status, subtotal, tax, shipping_cost, total, created_at`,
      [
        userId,
        shipping_address_id || null,
        billing_address_id || null,
        subtotal,
        tax,
        shippingCost,
        total,
        notes?.trim?.() || null,
      ]
    );

    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    for (const row of cartResult.rows) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [row.quantity, row.product_id]
      );
    }

    await client.query('COMMIT');

    const itemsWithNames = orderItems.map((item, i) => ({
      ...item,
      product_name: cartResult.rows[i].name,
    }));

    res.status(201).json({
      order: {
        ...order,
        items: itemsWithNames,
      },
    });
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid address' });
    }
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Checkout failed' });
  } finally {
    client.release();
  }
});

router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: validStatuses,
      });
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
