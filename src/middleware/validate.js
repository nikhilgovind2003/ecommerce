// Put it after the express-validator rules. If any rule failed, answer 400 with the field messages.
import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

export default function (req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map(function (e) { return { field: e.path, message: e.msg }; });
  next(AppError.badRequest('Validation failed', errors));
}
