// Routes for /api/users. Only /me is open to every logged-in user, the rest is admin only.
import { Router } from 'express';
import userController from './user.controller.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import authorize from '../../shared/middleware/authorize.js';
import validate from '../../shared/middleware/validate.js';
import { idParam } from '../../shared/validators/common.js';
import { listRules, statusRules, updateProfileRules } from './user.validators.js';

const router = Router();

router.use(requireAuth);

// any logged-in user
router.put('/me', updateProfileRules, validate, userController.updateMe);

// admin only (everything below)
router.use(authorize('admin'));
router.get('/', listRules, validate, userController.list);
router.get('/:id', idParam(), validate, userController.getOne);
router.patch('/:id/status', idParam(), statusRules, validate, userController.setStatus);

export default router;
