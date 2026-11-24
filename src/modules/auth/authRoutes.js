// Routes for /api/auth: register, login and "who am I".
import { Router } from 'express';
import AuthController from './authController.js';
import { requireAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiters.js';
import { registerRules, loginRules } from './authValidators.js';

const router = Router();

// public
router.post('/register', authLimiter, registerRules, validate, AuthController.register);
router.post('/login', authLimiter, loginRules, validate, AuthController.login);

// any logged-in user (everything below)
router.use(requireAuth);
router.get('/me', AuthController.me);

export default router;
