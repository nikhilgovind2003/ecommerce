const AppError = require('../utils/AppError');

// Usage: router.use(auth, authorize('admin'))
module.exports = (...roles) => (req, res, next) => {
  if (!req.user) return next(AppError.unauthorized());
  if (!roles.includes(req.user.role)) return next(AppError.forbidden());
  next();
};
