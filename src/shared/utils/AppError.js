// An error we throw on purpose (wrong input, not found, ...).
// The error handler sends its message and status code straight to the client.
export default class AppError extends Error {
  constructor(message, status = 500, errors) {
    super(message);
    this.status = status;
    this.errors = errors; // optional list of field-level problems
    this.isOperational = true; // tells the error handler this one is expected
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
}
