// Routes for /api/orders. Customers use /my, admins use the rest.
import { Router } from 'express';
import OrderController from './orderController.js';
import { requireAuth } from '../../middleware/auth.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { idParam } from '../../validators/common.js';
import { createRules, statusRules, listRules } from './orderValidators.js';

const router = Router();

// any logged-in user (everything below)
router.use(requireAuth);

// customer only. POST / shares its path with the admin list, so it checks the role itself.
router.post('/', authorize('customer'), createRules, validate, OrderController.create);
router.use('/my', authorize('customer'));
router.get('/my', listRules, validate, OrderController.listMine);
router.get('/my/:id', idParam(), validate, OrderController.getMine);
router.patch('/my/:id/cancel', idParam(), validate, OrderController.cancelMine);

// admin only (everything below)
router.use(authorize('admin'));
router.get('/', listRules, validate, OrderController.listAll);
router.get('/:id', idParam(), validate, OrderController.getOne);
router.patch('/:id/status', idParam(), statusRules, validate, OrderController.updateStatus);

export default router;
