// components.schemas
export const schemas = {
  Error: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'error' },
      message: { type: 'string' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: { field: { type: 'string' }, message: { type: 'string' } },
        },
      },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      pages: { type: 'integer' },
    },
  },
  User: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      role: { type: 'string', enum: ['admin', 'customer'] },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  AuthResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'success' },
      data: {
        type: 'object',
        properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
      },
    },
  },
  Category: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string' },
      parent: { type: 'string', nullable: true },
      ancestors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ids from the root down to the parent',
      },
      isActive: { type: 'boolean' },
    },
  },
  CategoryNode: {
    allOf: [
      { $ref: '#/components/schemas/Category' },
      {
        type: 'object',
        properties: { children: { type: 'array', items: { $ref: '#/components/schemas/CategoryNode' } } },
      },
    ],
  },
  CategoryInput: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'Android Phones', description: 'Required when creating' },
      description: { type: 'string' },
      parent: {
        type: 'string',
        nullable: true,
        description: 'Parent category id, or null for a root category',
        default: null,
        example: null,
      },
      isActive: { type: 'boolean' },
    },
  },
  Product: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      sku: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number' },
      salePrice: { type: 'number', nullable: true },
      effectivePrice: { type: 'number', description: 'Sale price when set, otherwise price' },
      stock: { type: 'integer' },
      category: {
        type: 'object',
        properties: { _id: { type: 'string' }, name: { type: 'string' }, slug: { type: 'string' } },
      },
      status: { type: 'string', enum: ['active', 'inactive'] },
    },
  },
  ProductInput: {
    type: 'object',
    description: 'All of name, sku, price and category are required when creating.',
    properties: {
      name: { type: 'string', example: 'Galaxy S24' },
      sku: { type: 'string', example: 'SAM-S24' },
      description: { type: 'string' },
      price: { type: 'number', minimum: 0, example: 900 },
      salePrice: {
        type: 'number',
        nullable: true,
        minimum: 0,
        description: 'Must not exceed price',
        example: 800,
      },
      stock: { type: 'integer', minimum: 0, example: 25 },
      category: { type: 'string', description: 'Category id' },
      status: { type: 'string', enum: ['active', 'inactive'] },
    },
  },
  Address: {
    type: 'object',
    required: ['fullName', 'phone', 'line1', 'city', 'postalCode', 'country'],
    properties: {
      fullName: { type: 'string' },
      phone: { type: 'string' },
      line1: { type: 'string' },
      line2: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      postalCode: { type: 'string' },
      country: { type: 'string' },
    },
  },
  OrderStatus: {
    type: 'string',
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
  },
  Order: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      user: {
        description: 'User id (populated with name and email in admin views)',
        oneOf: [{ type: 'string' }, { type: 'object' }],
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            product: { type: 'string' },
            name: { type: 'string' },
            sku: { type: 'string' },
            price: { type: 'number', description: 'Unit price at the time of purchase' },
            quantity: { type: 'integer' },
            subtotal: { type: 'number' },
          },
        },
      },
      totalAmount: { type: 'number' },
      status: { $ref: '#/components/schemas/OrderStatus' },
      shippingAddress: { $ref: '#/components/schemas/Address' },
      statusHistory: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            status: { $ref: '#/components/schemas/OrderStatus' },
            changedBy: { type: 'string' },
            note: { type: 'string' },
            changedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
};
