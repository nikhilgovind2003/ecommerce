const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { idParam } = require('../validators/common');
const { createRules, statusRules, listRules } = require('../validators/orderValidators');

router.use(auth);

// customer
router.post('/', authorize('customer'), createRules, validate, ctrl.create);
router.get('/my', authorize('customer'), listRules, validate, ctrl.listMine);
router.get('/my/:id', authorize('customer'), idParam(), validate, ctrl.getMine);
router.patch('/my/:id/cancel', authorize('customer'), idParam(), validate, ctrl.cancelMine);

// admin
router.get('/', authorize('admin'), listRules, validate, ctrl.listAll);
router.get('/:id', authorize('admin'), idParam(), validate, ctrl.getOne);
router.patch('/:id/status', authorize('admin'), idParam(), statusRules, validate, ctrl.updateStatus);

module.exports = router;
