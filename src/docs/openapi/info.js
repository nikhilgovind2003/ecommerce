// Title, description, servers, tags and default security.
export const info = {
  title: 'E-commerce REST API',
  version: '1.0.0',
  description: `Backend for a basic e-commerce application: users, multi-level categories, products and orders.

**Auth:** send \`Authorization: Bearer <token>\` (token comes from \`/api/auth/login\` or \`/api/auth/register\`).
**Roles:** \`admin\` and \`customer\`. Public sign-up always creates a customer; the first admin comes from \`npm run seed:admin\`.

**Errors** always look like \`{ "status": "error", "message": "...", "errors": [ { "field": "...", "message": "..." } ] }\`.
`,
};

export const servers = [{ url: '/', description: 'Same origin as this page' }];

export const tags = [
  { name: 'Auth' },
  { name: 'Users' },
  { name: 'Categories' },
  { name: 'Products' },
  { name: 'Orders' },
];

export const security = [{ bearerAuth: [] }];
