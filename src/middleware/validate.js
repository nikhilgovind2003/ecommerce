const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Runs after express-validator chains; turns failures into a 400 with field details.
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(AppError.badRequest('Validation failed', errors));
};
