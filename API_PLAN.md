# E-commerce REST API - Endpoint Plan

Base URL: `/api` (e.g. `GET /api/products`)

---

## Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account | — |
| POST | `/api/auth/login` | Login, return JWT | — |
| GET | `/api/auth/me` | Current user profile | ✓ |

---

## Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/:id` | Get user by ID | ✓ (self or admin) |
| PATCH | `/api/users/:id` | Update profile | ✓ (self only) |
| DELETE | `/api/users/:id` | Delete account | ✓ (self or admin) |

---

## Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/categories` | List all (optionally with `?parent_id=`) | — |
| GET | `/api/categories/:id` | Get category + children | — |
| POST | `/api/categories` | Create category | ✓ Admin |
| PATCH | `/api/categories/:id` | Update category | ✓ Admin |
| DELETE | `/api/categories/:id` | Delete category | ✓ Admin |

---

## Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | List products (filter: `?category_id=`, `?search=`) | — |
| GET | `/api/products/:id` | Get product by ID | — |
| POST | `/api/products` | Create product | ✓ Admin |
| PATCH | `/api/products/:id` | Update product | ✓ Admin |
| DELETE | `/api/products/:id` | Soft-delete (set is_active=false) | ✓ Admin |

---

## Addresses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/:userId/addresses` | List user's addresses | ✓ (self) |
| POST | `/api/users/:userId/addresses` | Add address | ✓ (self) |
| PATCH | `/api/addresses/:id` | Update address | ✓ (owner) |
| DELETE | `/api/addresses/:id` | Delete address | ✓ (owner) |

---

## Cart

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/cart` | Get current user's cart | ✓ |
| POST | `/api/cart/items` | Add item (product_id, quantity) | ✓ |
| PATCH | `/api/cart/items/:id` | Update quantity | ✓ |
| DELETE | `/api/cart/items/:id` | Remove item | ✓ |
| DELETE | `/api/cart` | Clear cart | ✓ |

---

## Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/orders` | List user's orders (filter: `?status=`) | ✓ |
| GET | `/api/orders/:id` | Get order + items | ✓ (owner or admin) |
| POST | `/api/orders` | Create order from cart (body: shipping_address_id, billing_address_id) | ✓ |
| PATCH | `/api/orders/:id` | Update status | ✓ Admin |

---

## Reviews

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products/:productId/reviews` | List reviews for product | — |
| POST | `/api/products/:productId/reviews` | Create/update review | ✓ |
| DELETE | `/api/reviews/:id` | Delete own review | ✓ |

---

## Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | DB health check |
| GET | `/` | Welcome message |

---

## Response Conventions

- Success: `200` with JSON body
- Created: `201` with resource in body
- No content: `204` for DELETE
- Client error: `400` (validation), `401` (unauthorized), `403` (forbidden), `404` (not found)
- Server error: `500` with `{ error: "message" }`

---

## Implementation Order (suggested)

1. **Products** + **Categories** (public catalog)
2. **Auth** (register, login)
3. **Users** (profile)
4. **Addresses**
5. **Cart**
6. **Orders** (checkout from cart)
7. **Reviews**
