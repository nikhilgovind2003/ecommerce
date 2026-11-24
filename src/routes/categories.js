const router = require('express').Router();
const ctrl = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { createRules, updateRules, listRules } = require('../validators/categoryValidators');

// public reads
router.get('/tree', optionalAuth, ctrl.tree);
router.get('/', listRules, validate, ctrl.list);
router.get('/:id', idParam(), validate, ctrl.getOne);

// admin writes
router.post('/', auth, authorize('admin'), createRules, validate, ctrl.create);
router.put('/:id', auth, authorize('admin'), idParam(), updateRules, validate, ctrl.update);
router.delete('/:id', auth, authorize('admin'), idParam(), validate, ctrl.remove);

module.exports = router;
