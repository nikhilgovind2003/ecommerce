// Routes for /api/products. Browsing is public, changing needs an admin.
import { Router } from 'express';
import productController from './product.controller.js';
import { requireAuth, optionalAuth } from '../../shared/middleware/auth.js';
import authorize from '../../shared/middleware/authorize.js';
import validate from '../../shared/middleware/validate.js';
import { idParam } from '../../shared/validators/common.js';
import { createRules, updateRules, listRules } from './product.validators.js';

const router = Router();

const adminOnly = [requireAuth, authorize('admin')];

// Must be declared before '/:id', otherwise "admin" would be read as an id.
router.get('/admin/all', ...adminOnly, listRules, validate, productController.adminList);

// storefront
router.get('/', listRules, validate, productController.list);
router.get('/:id', optionalAuth, idParam(), validate, productController.getOne);

// only admins can change
router.post('/', ...adminOnly, createRules, validate, productController.create);
router.put('/:id', ...adminOnly, idParam(), updateRules, validate, productController.update);
router.delete('/:id', ...adminOnly, idParam(), validate, productController.remove);

export default router;
