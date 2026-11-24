// Routes for /api/categories. Reading is public, changing needs an admin.
import { Router } from 'express';
import categoryController from './category.controller.js';
import { requireAuth, optionalAuth } from '../../shared/middleware/auth.js';
import authorize from '../../shared/middleware/authorize.js';
import validate from '../../shared/middleware/validate.js';
import { idParam } from '../../shared/validators/common.js';
import { createRules, updateRules, listRules } from './category.validators.js';

const router = Router();

const adminOnly = [requireAuth, authorize('admin')];

// anyone can read
router.get('/tree', optionalAuth, categoryController.tree);
router.get('/', listRules, validate, categoryController.list);
router.get('/:id', idParam(), validate, categoryController.getOne);

// only admins can change
router.post('/', ...adminOnly, createRules, validate, categoryController.create);
router.put('/:id', ...adminOnly, idParam(), updateRules, validate, categoryController.update);
router.delete('/:id', ...adminOnly, idParam(), validate, categoryController.remove);

export default router;
