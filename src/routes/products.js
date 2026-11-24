const router = require('express').Router();
const ctrl = require('../controllers/productController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { createRules, updateRules, listRules } = require('../validators/productValidators');

const admin = [auth, authorize('admin')];

// admin view must be declared before '/:id'
router.get('/admin/all', ...admin, listRules, validate, ctrl.adminList);

// storefront
router.get('/', listRules, validate, ctrl.list);
router.get('/:id', optionalAuth, idParam(), validate, ctrl.getOne);

// admin writes
router.post('/', ...admin, createRules, validate, ctrl.create);
router.put('/:id', ...admin, idParam(), updateRules, validate, ctrl.update);
router.delete('/:id', ...admin, idParam(), validate, ctrl.remove);

module.exports = router;
