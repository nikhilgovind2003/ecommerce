class AppError extends Error {
  constructor(message, status = 500, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.isOperational = true;
  }

  static badRequest(msg, errors) { return new AppError(msg, 400, errors); }
  static unauthorized(msg = 'Not authenticated') { return new AppError(msg, 401); }
  static forbidden(msg = 'You do not have permission to do that') { return new AppError(msg, 403); }
  static notFound(msg = 'Resource not found') { return new AppError(msg, 404); }
  static conflict(msg) { return new AppError(msg, 409); }
}

module.exports = AppError;
