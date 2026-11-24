// components.responses
export const responses = {
  ValidationError: {
    description: 'Validation failed',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Unauthorized: {
    description: 'Missing',
    'invalid or expired token': null,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Forbidden: {
    description: 'Not allowed for this role or account is deactivated',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  NotFound: {
    description: 'Resource not found',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  TooManyRequests: {
    description: 'Rate limit exceeded',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  ProductPage: {
    description: 'Page of products',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
      },
    },
  },
  OrderPage: {
    description: 'Page of orders',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
      },
    },
  },
};
