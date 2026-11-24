// An error we throw on purpose (wrong input, not found, ...).
// The error handler sends its message and status code straight to the client.
export default class AppError extends Error {
  constructor(message, status = 500, errors) {
    // super() returns the new error, so the fields can be attached directly.
    // `errors` is an optional list of field-level problems.
    // `isOperational` tells the error handler the error is expected.
    return Object.assign(super(message), { status, errors, isOperational: true });
  }

  static badRequest(message, errors) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Not authenticated') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'You do not have permission to do that') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }

  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new AppError(message, 429);
  }
}
