// Routes for /api/categories. Reading is public, changing needs an admin.
import { Router } from 'express';
import CategoryController from './categoryController.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { idParam } from '../../validators/common.js';
import { createRules, updateRules, listRules } from './categoryValidators.js';

const router = Router();

// public
router.get('/tree', optionalAuth, CategoryController.tree);
router.get('/', listRules, validate, CategoryController.list);
router.get('/:id', idParam(), validate, CategoryController.getOne);

// admin only (everything below)
router.use(requireAuth, authorize('admin'));
router.post('/', createRules, validate, CategoryController.create);
router.put('/:id', idParam(), updateRules, validate, CategoryController.update);
router.delete('/:id', idParam(), validate, CategoryController.remove);

export default router;
