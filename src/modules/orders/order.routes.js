// Routes for /api/orders. Customers use /my, admins use the rest.
import { Router } from 'express';
import orderController from './order.controller.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import authorize from '../../shared/middleware/authorize.js';
import validate from '../../shared/middleware/validate.js';
import { idParam } from '../../shared/validators/common.js';
import { createRules, statusRules, listRules } from './order.validators.js';

const router = Router();

router.use(requireAuth);

// customer
router.post('/', authorize('customer'), createRules, validate, orderController.create);
router.get('/my', authorize('customer'), listRules, validate, orderController.listMine);
router.get('/my/:id', authorize('customer'), idParam(), validate, orderController.getMine);
router.patch('/my/:id/cancel', authorize('customer'), idParam(), validate, orderController.cancelMine);

// admin
router.get('/', authorize('admin'), listRules, validate, orderController.listAll);
router.get('/:id', authorize('admin'), idParam(), validate, orderController.getOne);
router.patch('/:id/status', authorize('admin'), idParam(), statusRules, validate, orderController.updateStatus);

export default router;
