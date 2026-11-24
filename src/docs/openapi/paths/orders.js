// Orders endpoints.
export const ordersPaths = {
  '/api/orders': {
    post: {
      tags: ['Orders'],
      summary: 'Place an order (customer)',
      description: `Send only product ids and quantities. Prices, subtotals and the total are calculated on the server,
and stock is reduced atomically. Duplicate product lines are merged.
\`400\` = items unavailable or not enough stock (details in \`errors\`), \`409\` = stock changed while the order was being placed.
`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['items', 'shippingAddress'],
              properties: {
                items: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 50,
                  items: {
                    type: 'object',
                    required: ['product', 'quantity'],
                    properties: {
                      product: { type: 'string', description: 'Product id' },
                      quantity: { type: 'integer', minimum: 1, maximum: 1000 },
                    },
                  },
                },
                shippingAddress: { $ref: '#/components/schemas/Address' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Order created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Order' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': {
          description: 'Stock changed while ordering',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    get: {
      tags: ['Orders'],
      summary: 'List all orders (admin)',
      parameters: [
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/OrderStatus' } },
        {
          name: 'user',
          in: 'query',
          description: 'Filter by customer id',
          schema: { type: 'string' },
        },
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
      ],
      responses: {
        '200': { $ref: '#/components/responses/OrderPage' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/api/orders/my': {
    get: {
      tags: ['Orders'],
      summary: 'My orders (customer)',
      parameters: [
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/OrderStatus' } },
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
      ],
      responses: {
        '200': { $ref: '#/components/responses/OrderPage' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/api/orders/my/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'One of my orders (customer)',
      description: 'Orders that belong to someone else return 404.',
      parameters: [{ $ref: '#/components/parameters/Id' }],
      responses: {
        '200': {
          description: 'Order',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Order' } },
              },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/orders/my/{id}/cancel': {
    patch: {
      tags: ['Orders'],
      summary: 'Cancel my pending order (customer)',
      description: 'Only `pending` orders can be cancelled by the customer. Stock is returned.',
      parameters: [{ $ref: '#/components/parameters/Id' }],
      responses: {
        '200': {
          description: 'Cancelled order',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Order' } },
              },
            },
          },
        },
        '400': {
          description: 'Order is no longer pending',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': {
          description: 'Order changed at the same time',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  '/api/orders/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'Get any order (admin)',
      parameters: [{ $ref: '#/components/parameters/Id' }],
      responses: {
        '200': {
          description: 'Order',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Order' } },
              },
            },
          },
        },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/orders/{id}/status': {
    patch: {
      tags: ['Orders'],
      summary: 'Update order status (admin)',
      description: `Allowed transitions: \`pending → confirmed | cancelled\`, \`confirmed → processing | cancelled\`,
\`processing → shipped | cancelled\`, \`shipped → delivered\`. \`delivered\` and \`cancelled\` are final.
Cancelling returns the stock.
`,
      parameters: [{ $ref: '#/components/parameters/Id' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { $ref: '#/components/schemas/OrderStatus' },
                note: { type: 'string', maxLength: 300 },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated order',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Order' } },
              },
            },
          },
        },
        '400': {
          description: 'Invalid status or transition',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': {
          description: 'Order changed at the same time',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
};
