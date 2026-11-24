// Users endpoints.
export const usersPaths = {
  '/api/users/me': {
    put: {
      tags: ['Users'],
      summary: 'Update own name and/or password',
      description: 'Changing the password requires `currentPassword`.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                password: { type: 'string', minLength: 6 },
                currentPassword: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/users': {
    get: {
      tags: ['Users'],
      summary: 'List users (admin)',
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['admin', 'customer'] } },
        { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
        {
          name: 'search',
          in: 'query',
          description: 'Matches name or email',
          schema: { type: 'string' },
        },
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
      ],
      responses: {
        '200': {
          description: 'Page of users',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/api/users/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Get a user (admin)',
      parameters: [{ $ref: '#/components/parameters/Id' }],
      responses: {
        '200': {
          description: 'User',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/users/{id}/status': {
    patch: {
      tags: ['Users'],
      summary: 'Activate or deactivate a user (admin)',
      description: 'Deactivated users are locked out immediately, even with an unexpired token. Admins cannot deactivate themselves.',
      parameters: [{ $ref: '#/components/parameters/Id' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['isActive'], properties: { isActive: { type: 'boolean' } } },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated user',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
