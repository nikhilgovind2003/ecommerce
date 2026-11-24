const AppError = require('../utils/AppError');

const notFound = (req, res, next) => next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// Translate library errors into AppErrors so the response shape stays consistent.
const normalize = (err) => {
  if (err instanceof AppError) return err;
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return AppError.badRequest('Validation failed', errors);
  }
  if (err.name === 'CastError') return AppError.badRequest(`Invalid ${err.path}: ${err.value}`);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return AppError.conflict(`Duplicate value for ${field}`);
  }
  if (err.name === 'TokenExpiredError') return AppError.unauthorized('Token expired');
  if (err.name === 'JsonWebTokenError') return AppError.unauthorized('Invalid token');
  if (err.type === 'entity.parse.failed') return AppError.badRequest('Malformed JSON body');
  return err;
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const error = normalize(err);
  const status = error.isOperational ? error.status : 500;
  if (status >= 500) console.error(err);

  const body = {
    status: 'error',
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  };
  if (error.errors) body.errors = error.errors;
  if (status >= 500 && process.env.NODE_ENV !== 'production') body.stack = err.stack;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
