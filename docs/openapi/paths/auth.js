// Auth endpoints.
export const authPaths = {
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a customer account',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'Jane Doe' },
                email: { type: 'string', format: 'email', example: 'jane@example.com' },
                password: { type: 'string', minLength: 6, example: 'secret123' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Account created',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '409': {
          description: 'Email already registered',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Logged in',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': {
          description: 'Invalid email or password',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        '403': {
          description: 'Account deactivated',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user profile',
      responses: {
        '200': {
          description: 'Profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string' }, data: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
};
