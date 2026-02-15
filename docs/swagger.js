const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'E-commerce REST API',
    description: 'Express + PostgreSQL REST API for e-commerce',
    version: '1.0.0',
  },
  servers: [{ url: `http://localhost:${process.env.PORT || 3000}`, description: 'Local server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin'] },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          stock_quantity: { type: 'integer' },
          category_id: { type: 'integer' },
          image_url: { type: 'string' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string' },
          category_name: { type: 'string' },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          product_id: { type: 'integer' },
          quantity: { type: 'integer' },
          created_at: { type: 'string' },
          product: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
              image_url: { type: 'string' },
              stock_quantity: { type: 'integer' },
            },
          },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          parent_id: { type: 'integer', nullable: true },
          created_at: { type: 'string' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          status: { type: 'string' },
          subtotal: { type: 'number' },
          tax: { type: 'number' },
          shipping_cost: { type: 'number' },
          total: { type: 'number' },
          notes: { type: 'string' },
          created_at: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                product_id: { type: 'integer' },
                quantity: { type: 'integer' },
                unit_price: { type: 'number' },
                total_price: { type: 'number' },
                product_name: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        summary: 'Welcome',
        tags: ['Utility'],
        responses: { 200: { description: 'Welcome message' } },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Utility'],
        responses: { 200: { description: 'Database connected' }, 500: { description: 'Database disconnected' } },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Create account',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string', minLength: 8 }, first_name: { type: 'string' }, last_name: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'User created' }, 400: { description: 'Validation failed' }, 409: { description: 'Email already registered' } },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Returns JWT and user' }, 401: { description: 'Invalid email or password' } },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Current user',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User profile' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/api/users/{id}': {
      get: {
        summary: 'Get user',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'User' }, 403: { description: 'Access denied' }, 404: { description: 'User not found' } },
      },
      patch: {
        summary: 'Update profile',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { first_name: { type: 'string' }, last_name: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'Updated user' }, 403: { description: 'Can only update own profile' }, 404: { description: 'User not found' } },
      },
      delete: {
        summary: 'Delete account',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Deleted' }, 400: { description: 'User has orders' }, 403: { description: 'Access denied' }, 404: { description: 'User not found' } },
      },
    },
    '/api/categories': {
      get: {
        summary: 'List categories',
        tags: ['Categories'],
        parameters: [
          { name: 'parent_id', in: 'query', description: 'Filter by parent. Use "null" for root categories.', schema: { oneOf: [{ type: 'integer' }, { type: 'string', enum: ['null'] }] } },
        ],
        responses: { 200: { description: 'Categories list' } },
      },
      post: {
        summary: 'Create category',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' }, parent_id: { type: 'integer', nullable: true } },
              },
            },
          },
        },
        responses: { 201: { description: 'Category created' }, 400: { description: 'Validation failed or invalid parent_id' }, 403: { description: 'Admin required' } },
      },
    },
    '/api/categories/{id}': {
      get: {
        summary: 'Get category with children',
        tags: ['Categories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Category with children array' }, 404: { description: 'Category not found' } },
      },
      patch: {
        summary: 'Update category',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' }, parent_id: { type: 'integer', nullable: true } } },
            },
          },
        },
        responses: { 200: { description: 'Updated category' }, 400: { description: 'Invalid parent_id' }, 403: { description: 'Admin required' }, 404: { description: 'Category not found' } },
      },
      delete: {
        summary: 'Delete category',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Category deleted' }, 403: { description: 'Admin required' }, 404: { description: 'Category not found' } },
      },
    },
    '/api/products': {
      get: {
        summary: 'List products',
        tags: ['Products'],
        parameters: [
          { name: 'category_id', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Products list' } },
      },
      post: {
        summary: 'Create product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'price'],
                properties: { name: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, stock_quantity: { type: 'integer' }, category_id: { type: 'integer' }, image_url: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Product created' }, 400: { description: 'Validation failed' }, 403: { description: 'Admin required' } },
      },
    },
    '/api/products/{id}': {
      get: {
        summary: 'Get product',
        tags: ['Products'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Product' }, 404: { description: 'Product not found' } },
      },
      patch: {
        summary: 'Update product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, stock_quantity: { type: 'integer' }, category_id: { type: 'integer' }, image_url: { type: 'string' }, is_active: { type: 'boolean' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated product' }, 403: { description: 'Admin required' }, 404: { description: 'Product not found' } },
      },
      delete: {
        summary: 'Soft-delete product',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Product deactivated' }, 403: { description: 'Admin required' }, 404: { description: 'Product not found' } },
      },
    },
    '/api/cart': {
      get: {
        summary: 'Get cart',
        tags: ['Cart'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Cart items' } },
      },
      delete: {
        summary: 'Clear cart',
        tags: ['Cart'],
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'Cart cleared' } },
      },
    },
    '/api/cart/items': {
      post: {
        summary: 'Add to cart',
        tags: ['Cart'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['product_id', 'quantity'], properties: { product_id: { type: 'integer' }, quantity: { type: 'integer', minimum: 1 } } },
            },
          },
        },
        responses: { 201: { description: 'Item added' }, 400: { description: 'Not enough stock' }, 404: { description: 'Product not found' } },
      },
    },
    '/api/cart/items/{id}': {
      patch: {
        summary: 'Update cart item quantity',
        tags: ['Cart'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['quantity'], properties: { quantity: { type: 'integer', minimum: 1 } } },
            },
          },
        },
        responses: { 200: { description: 'Updated' }, 400: { description: 'Not enough stock' }, 404: { description: 'Cart item not found' } },
      },
      delete: {
        summary: 'Remove from cart',
        tags: ['Cart'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Removed' }, 404: { description: 'Cart item not found' } },
      },
    },
    '/api/orders': {
      get: {
        summary: 'List orders',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] } }],
        responses: { 200: { description: 'Orders list' } },
      },
      post: {
        summary: 'Checkout',
        description: 'Create order from cart. Clears cart and decrements stock.',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { shipping_address_id: { type: 'integer' }, billing_address_id: { type: 'integer' }, notes: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Order created' }, 400: { description: 'Cart empty, insufficient stock, or invalid address' } },
      },
    },
    '/api/orders/{id}': {
      get: {
        summary: 'Get order',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Order with items' }, 403: { description: 'Access denied' }, 404: { description: 'Order not found' } },
      },
      patch: {
        summary: 'Update order status',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] } } },
            },
          },
        },
        responses: { 200: { description: 'Status updated' }, 400: { description: 'Invalid status' }, 403: { description: 'Admin required' }, 404: { description: 'Order not found' } },
      },
    },
  },
};

module.exports = swaggerDocument;
