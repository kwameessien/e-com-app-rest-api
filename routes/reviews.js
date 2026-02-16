const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id, user_id FROM reviews WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Review delete error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
