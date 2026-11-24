// Assembles the OpenAPI document from the section files in the same folder.
import { info, servers, tags, security } from './info.js';
import { authPaths } from './paths/auth.js';
import { usersPaths } from './paths/users.js';
import { categoriesPaths } from './paths/categories.js';
import { productsPaths } from './paths/products.js';
import { ordersPaths } from './paths/orders.js';
import { securitySchemes } from './components/securitySchemes.js';
import { parameters } from './components/parameters.js';
import { responses } from './components/responses.js';
import { schemas } from './components/schemas.js';

const spec = {
  openapi: '3.0.3',
  info,
  servers,
  tags,
  security,
  paths: {
    ...authPaths,
    ...usersPaths,
    ...categoriesPaths,
    ...productsPaths,
    ...ordersPaths,
  },
  components: { securitySchemes, parameters, responses, schemas },
};

export default spec;
