const { body, query } = require('express-validator');

const parentField = body('parent')
  .optional({ values: 'null' })
  .isMongoId()
  .withMessage('parent must be a valid category id or null');

exports.createRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  parentField,
];

exports.updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  parentField,
];

exports.listRules = [
  query('parent')
    .optional()
    .custom((v) => v === 'null' || /^[a-f\d]{24}$/i.test(v))
    .withMessage('parent must be a category id or "null"'),
];
