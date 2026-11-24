const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, me } = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerRules, loginRules } = require('../validators/authValidators');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 });

router.post('/register', limiter, registerRules, validate, register);
router.post('/login', limiter, loginRules, validate, login);
router.get('/me', auth, me);

module.exports = router;
