// Categories endpoints.
export const categoriesPaths = {
  '/api/categories/tree': {
    get: {
      tags: ['Categories'],
      summary: 'Complete category hierarchy',
      description: 'Nested tree of any depth. Inactive branches are hidden unless an admin passes `includeInactive=true`.',
      security: [{}, { bearerAuth: [] }],
      parameters: [
        {
          name: 'includeInactive',
          in: 'query',
          description: 'Admin only',
          schema: { type: 'boolean' },
        },
      ],
      responses: {
        '200': {
          description: 'Category tree',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/CategoryNode' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/categories': {
    get: {
      tags: ['Categories'],
      summary: 'List categories (flat)',
      security: [],
      parameters: [
        {
          name: 'parent',
          in: 'query',
          description: 'A category id, or the word "null" for root categories',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Categories',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Categories'],
      summary: 'Create a category (admin)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } } },
      },
      responses: {
        '201': {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Category' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': {
          description: 'Parent category not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        '409': {
          description: 'Same name already exists under that parent',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  '/api/categories/{id}': {
    parameters: [{ $ref: '#/components/parameters/Id' }],
    get: {
      tags: ['Categories'],
      summary: 'Get a category',
      security: [],
      responses: {
        '200': {
          description: 'Category',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Category' } },
              },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Categories'],
      summary: 'Update or move a category (admin)',
      description: `Changing \`parent\` moves the whole subtree. A category cannot become its own parent or move under
one of its own descendants (400). Use \`"parent": null\` to make it a root category.
`,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } } },
      },
      responses: {
        '200': {
          description: 'Updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/Category' } },
              },
            },
          },
        },
        '400': {
          description: 'Validation error or circular relationship',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': {
          description: 'Duplicate sibling name',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    delete: {
      tags: ['Categories'],
      summary: 'Delete a category (admin)',
      responses: {
        '200': { description: 'Deleted' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': {
          description: 'Category still has sub-categories or products',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
};
