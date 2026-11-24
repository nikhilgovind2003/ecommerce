// Express 5 already forwards rejected promises, but this keeps handlers
// explicit and works the same way if the app is ever moved to Express 4.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
