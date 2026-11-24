// Input rules for placing an order, changing its status and listing orders.
import { body, query } from 'express-validator';
import { ORDER_STATUSES } from '../../database/models/orderModel.js';

function addr(f) { return body(`shippingAddress.${f}`).trim().notEmpty().withMessage(`shippingAddress.${f} is required`); }

export const createRules = [
  body('items').isArray({ min: 1, max: 50 }).withMessage('items must be an array of 1 to 50 entries'),
  body('items.*.product').isMongoId().withMessage('items[].product must be a valid product id'),
  body('items.*.quantity').isInt({ min: 1, max: 1000 }).withMessage('items[].quantity must be a whole number from 1 to 1000').toInt(),
  body('shippingAddress').isObject().withMessage('shippingAddress is required'),
  ...['fullName', 'phone', 'line1', 'city', 'postalCode', 'country'].map(addr),
  body('shippingAddress.line2').optional().isString(),
  body('shippingAddress.state').optional().isString(),
];

export const statusRules = [
  body('status').isIn(ORDER_STATUSES).withMessage(`status must be one of: ${ORDER_STATUSES.join(', ')}`),
  body('note').optional().isString().isLength({ max: 300 }),
];

export const listRules = [
  query('status').optional().isIn(ORDER_STATUSES).withMessage(`status must be one of: ${ORDER_STATUSES.join(', ')}`),
  query('user').optional().isMongoId().withMessage('user must be a valid id'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];
