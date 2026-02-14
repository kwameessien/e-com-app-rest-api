# E-commerce Database Design

## Entity Relationship Overview

```
users ──┬── addresses (shipping/billing)
        ├── orders ─── order_items ─── products
        ├── cart_items ────────────┘
        └── reviews ──────────────┘

categories ─── products (hierarchical)
```

## Tables

| Table       | Purpose |
|------------|---------|
| **users**  | Customers and admins; stores auth info and profile |
| **categories** | Product taxonomy (supports parent/child hierarchy) |
| **products** | Catalog with price, stock, category link |
| **addresses** | User addresses for shipping/billing |
| **orders** | Purchase records with status, totals, linked addresses |
| **order_items** | Line items: product, quantity, price per order |
| **cart_items** | Persistent cart for logged-in users |
| **reviews** | Product ratings and comments (one per user per product) |

## Key Relationships

- **Products → Categories**: Many-to-one (products belong to a category)
- **Orders → Users**: Many-to-one (user places many orders)
- **Order Items**: Links orders to products with quantity and snapshot price
- **Addresses**: Separate from users so multiple addresses per user

## Notes

- **Price snapshot**: `order_items` stores `unit_price` so historical prices are preserved.
- **Soft products**: `is_active` allows hiding products without deleting them.
- **Order flow**: `pending` → `confirmed` → `processing` → `shipped` → `delivered`
- **Cart uniqueness**: One row per user+product; update quantity for duplicates.
