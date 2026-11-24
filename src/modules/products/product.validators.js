// Input rules for the product endpoints, including the list filters.
import { body, query } from 'express-validator';
import { SORT_KEYS } from './product.service.js';

const price = (field, optional) => {
  const chain = body(field);
  return (optional ? chain.optional() : chain)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a number >= 0`)
    .toFloat();
};

const writeRules = (isCreate) => {
  const req = (chain, msg) => (isCreate ? chain.exists({ values: 'falsy' }).withMessage(msg).bail() : chain.optional());
  return [
    req(body('name'), 'Name is required').trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 200 }),
    req(body('sku'), 'SKU is required').trim().notEmpty().withMessage('SKU cannot be empty'),
    body('description').optional().isString().isLength({ max: 2000 }),
    price('price', !isCreate),
    // salePrice may be null to clear it
    body('salePrice').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('salePrice must be a number >= 0').toFloat(),
    body('stock').optional().isInt({ min: 0 }).withMessage('stock must be a whole number >= 0').toInt(),
    req(body('category'), 'Category is required').isMongoId().withMessage('category must be a valid id'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
    body().custom((value) => {
      if (value.price !== undefined && value.salePrice != null && value.salePrice > value.price) {
        throw new Error('salePrice cannot be higher than price');
      }
      return true;
    }),
  ];
};

export const createRules = writeRules(true);
export const updateRules = writeRules(false);

export const listRules = [
  query('category').optional().isMongoId().withMessage('category must be a valid id'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a number >= 0'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a number >= 0'),
  query('maxPrice').custom((max, { req }) => {
    if (max !== undefined && req.query.minPrice !== undefined && Number(max) < Number(req.query.minPrice)) {
      throw new Error('maxPrice cannot be lower than minPrice');
    }
    return true;
  }),
  query('sort').optional().isIn(SORT_KEYS).withMessage(`sort must be one of: ${SORT_KEYS.join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
];
