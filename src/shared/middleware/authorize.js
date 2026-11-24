// Role check. Use after requireAuth, e.g. router.use(requireAuth, authorize('admin')).
import AppError from '../utils/AppError.js';

export default (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
