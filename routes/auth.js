const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateRegister(body) {
  const { email, password, first_name, last_name } = body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('email is required');
  } else if (!emailRegex.test(email.trim())) {
    errors.push('email must be valid');
  }

  if (!password || typeof password !== 'string') {
    errors.push('password is required');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  return { email: email?.trim(), password, first_name: first_name?.trim(), last_name: last_name?.trim(), errors };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, errors } = validateRegister(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, password_hash, first_name || null, last_name || null]
    );

    const user = result.rows[0];
    res.status(201).json({ user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
