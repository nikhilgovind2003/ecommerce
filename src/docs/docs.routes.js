// Swagger UI at /api-docs and the raw spec at /api-docs.json.
// The spec itself lives in docs/openapi.yaml (project root), so Postman and other tools can import it too.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

const specPath = fileURLToPath(new URL('../../docs/openapi.yaml', import.meta.url));
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8')); // read once at startup

const router = Router();

router.get('/api-docs.json', (req, res) => res.json(spec));
router.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: 'E-commerce API docs',
    swaggerOptions: { persistAuthorization: true },
  })
);

export default router;
