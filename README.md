# E-commerce REST API

Express + PostgreSQL REST API for e-commerce.

## Project structure

```
├── app.js              # Entry point
├── db.js               # PostgreSQL connection pool
├── package.json
├── .env                 # Environment variables (not committed)
├── .gitignore
│
├── middleware/         # Express middleware
│   └── auth.js         # JWT auth, requireAdmin
│
├── routes/             # API route handlers
│   ├── auth.js         # /api/auth (register, login, me)
│   ├── users.js        # /api/users (get, update, delete)
│   ├── products.js     # /api/products
│   └── cart.js         # /api/cart
│
├── db/                  # Database scripts
│   └── schema.sql      # Table definitions
│
└── docs/               # Documentation
    ├── API_PLAN.md     # Endpoint reference
    └── DATABASE_DESIGN.md
```

## Setup

```bash
npm install
createdb e_com_app
psql -d e_com_app -f db/schema.sql
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env`, then:

```bash
npm start
```

## API

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Current user (Bearer token)
- `GET /api/users/:id` - Get user (self or admin)
- `PATCH /api/users/:id` - Update profile (self only)
- `DELETE /api/users/:id` - Delete account (self or admin)
- `GET /api/products` - List products (`?category_id=`, `?search=`)
- `GET /api/products/:id` - Get product
- `GET /api/cart` - Get cart (auth)
- `POST /api/cart/items` - Add item (auth)
- `PATCH /api/cart/items/:id` - Update quantity (auth)
- `DELETE /api/cart/items/:id` - Remove item (auth)
- `DELETE /api/cart` - Clear cart (auth)
- `POST /api/products` - Create (admin)
- `PATCH /api/products/:id` - Update (admin)
- `DELETE /api/products/:id` - Soft-delete (admin)
