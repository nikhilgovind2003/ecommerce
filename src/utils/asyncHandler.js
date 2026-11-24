// Wraps an async route handler so a thrown error is passed to the error handler.
export default function asyncHandler(handler) {
  return function (req, res, next) {
    return Promise.resolve(handler(req, res, next)).catch(next);
  };
}
