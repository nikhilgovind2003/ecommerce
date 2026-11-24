// Routes for /api/users. Only /me is open to every logged-in user, the rest is admin only.
import { Router } from 'express';
import UserController from './userController.js';
import { requireAuth } from '../../middleware/auth.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { idParam } from '../../validators/common.js';
import { listRules, statusRules, updateProfileRules } from './userValidators.js';

const router = Router();

router.use(requireAuth);

// any logged-in user
router.put('/me', updateProfileRules, validate, UserController.updateMe);

// admin only (everything below)
router.use(authorize('admin'));
router.get('/', listRules, validate, UserController.list);
router.get('/:id', idParam(), validate, UserController.getOne);
router.patch('/:id/status', idParam(), statusRules, validate, UserController.setStatus);

export default router;
