// Wraps an async route handler so a thrown error is passed to the error handler.
export default (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
