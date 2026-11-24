const router = require('express').Router();
const { register, login, me } = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const { registerRules, loginRules } = require('../validators/authValidators');

router.post('/register', authLimiter, registerRules, validate, register);
router.post('/login', authLimiter, loginRules, validate, login);
router.get('/me', auth, me);

module.exports = router;
