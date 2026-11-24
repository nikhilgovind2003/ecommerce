// Input rules for the user endpoints.
import { body, query } from 'express-validator';

export const listRules = [
  query('role').optional().isIn(['admin', 'customer']).withMessage('role must be admin or customer'),
  query('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
];

export const statusRules = [
  body('isActive').isBoolean({ strict: true }).withMessage('isActive must be a boolean'),
];

export const updateProfileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('currentPassword').if(body('password').exists()).notEmpty().withMessage('currentPassword is required to change password'),
];
