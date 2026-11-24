// Products endpoints.
export const productsPaths = {
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'Storefront product listing',
      description: 'Only active products. Filtering by a category also returns products of all its sub-categories.',
      security: [],
      parameters: [
        {
          name: 'search',
          in: 'query',
          description: 'Matches name',
          'SKU or description (case-insensitive)': null,
          schema: { type: 'string' },
        },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        {
          name: 'minPrice',
          in: 'query',
          description: 'Compared with the sale price when there is one',
          schema: { type: 'number' },
        },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        {
          name: 'sort',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'],
            default: 'newest',
          },
        },
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
      ],
      responses: {
        '200': { $ref: '#/components/responses/ProductPage' },
        '400': { $ref: '#/components/responses/ValidationError' },
      },
    },
    post: {
      tags: ['Products'],
      summary: 'Create a product (admin)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } },
      },
      responses: {
        '201': {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Product' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': {
          description: 'SKU already exists',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  '/api/products/admin/all': {
    get: {
      tags: ['Products'],
      summary: 'Admin product listing (includes inactive)',
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        {
          name: 'sort',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'],
          },
        },
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
      ],
      responses: {
        '200': { $ref: '#/components/responses/ProductPage' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/api/products/{id}': {
    parameters: [{ $ref: '#/components/parameters/Id' }],
    get: {
      tags: ['Products'],
      summary: 'Product details',
      description: 'Inactive products are only visible to admins (404 otherwise).',
      security: [{}, { bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Product',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Product' } },
              },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Products'],
      summary: 'Update a product (admin)',
      description: 'Partial update. `salePrice` may be `null` to remove the sale.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } },
      },
      responses: {
        '200': {
          description: 'Updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Product' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete a product (admin)',
      responses: {
        '200': { description: 'Deleted' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
