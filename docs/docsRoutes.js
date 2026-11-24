// Swagger UI at /api-docs and the raw spec at /api-docs.json.
// The spec is plain JS, split by section under docs/openapi/.
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import spec from './openapi/index.js';

const router = Router();

router.get('/api-docs.json', (req, res) => res.json(spec));
router.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: 'E-commerce API docs',
    swaggerOptions: { persistAuthorization: true, tryItOutEnabled: true },
  })
);

export default router;
