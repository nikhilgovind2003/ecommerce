// Routes for /api/auth: register, login and "who am I".
import { Router } from 'express';
import authController from './auth.controller.js';
import { requireAuth } from '../../shared/middleware/auth.js';
import validate from '../../shared/middleware/validate.js';
import { authLimiter } from '../../shared/middleware/rateLimiters.js';
import { registerRules, loginRules } from './auth.validators.js';

const router = Router();

router.post('/register', authLimiter, registerRules, validate, authController.register);
router.post('/login', authLimiter, loginRules, validate, authController.login);
router.get('/me', requireAuth, authController.me);

export default router;
