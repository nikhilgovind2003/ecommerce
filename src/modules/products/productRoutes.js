// Routes for /api/products. Browsing is public, changing needs an admin.
import { Router } from 'express';
import ProductController from './productController.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { idParam } from '../../validators/common.js';
import { createRules, updateRules, listRules } from './productValidators.js';

const router = Router();

// public (storefront)
router.get('/', listRules, validate, ProductController.list);
router.get('/:id', optionalAuth, idParam(), validate, ProductController.getOne);

// admin only (everything below)
router.use(requireAuth, authorize('admin'));
router.get('/admin/all', listRules, validate, ProductController.adminList);
router.post('/', createRules, validate, ProductController.create);
router.put('/:id', idParam(), updateRules, validate, ProductController.update);
router.delete('/:id', idParam(), validate, ProductController.remove);

export default router;
