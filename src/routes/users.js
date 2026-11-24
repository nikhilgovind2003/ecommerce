const router = require('express').Router();
const ctrl = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { listRules, statusRules, updateProfileRules } = require('../validators/userValidators');

router.use(auth);

// any logged-in user
router.put('/me', updateProfileRules, validate, ctrl.updateMe);

// admin only
router.use(authorize('admin'));
router.get('/', listRules, validate, ctrl.list);
router.get('/:id', idParam(), validate, ctrl.getOne);
router.patch('/:id/status', idParam(), statusRules, validate, ctrl.setStatus);

module.exports = router;
