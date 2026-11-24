// components.parameters
export const parameters = {
  Id: {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string', example: '64b0f3c2a1b2c3d4e5f60718' },
  },
  Page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  Limit: {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
  },
};
