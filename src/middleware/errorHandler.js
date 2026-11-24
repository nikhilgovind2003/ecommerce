// Last stop for every error. It makes sure the client always gets the same JSON shape:
// { status: 'error', message, errors? }
import AppError from '../utils/appError.js';

// Runs when no route matched.
export function notFound(req, res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Turns errors from Mongoose, JWT and Express into our own AppError.
// Anything we don't recognise is returned as-is and ends up as a 500.
function toAppError(err) {
  if (err instanceof AppError) return err;

  // Mongoose: a schema rule failed
  if (err.name === 'ValidationError' && err.errors) {
    const fields = Object.values(err.errors).map(function (e) { return { field: e.path, message: e.message }; });
    return AppError.badRequest('Validation failed', fields);
  }

  // Mongoose: an id like "abc" that is not a valid ObjectId
  if (err.name === 'CastError') {
    return AppError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // MongoDB: a unique index was broken (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return AppError.conflict(`Duplicate value for ${field}`);
  }

  // JWT problems
  if (err.name === 'TokenExpiredError') return AppError.unauthorized('Token expired');
  if (err.name === 'JsonWebTokenError') return AppError.unauthorized('Invalid token');

  // Express: the request body was not valid JSON
  if (err.type === 'entity.parse.failed') return AppError.badRequest('Malformed JSON body');

  return err;
}

// Express recognises an error handler by its 4 arguments, so `next` must stay even though it is unused.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const error = toAppError(err);
  const isProduction = process.env.NODE_ENV === 'production';

  // Only expected errors keep their own status. Everything else is a server bug.
  const status = error.isOperational ? error.status : 500;
  const isServerError = status >= 500;
  if (isServerError) console.error(err);

  const body = { status: 'error', message: error.message };
  if (error.errors) body.errors = error.errors;

  if (isServerError && isProduction) body.message = 'Internal server error'; // don't leak details
  if (isServerError && !isProduction) body.stack = err.stack; // handy while developing

  res.status(status).json(body);
}
