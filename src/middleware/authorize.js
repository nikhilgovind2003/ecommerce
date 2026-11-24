// Role check. Use after requireAuth, e.g. router.use(requireAuth, authorize('admin')).
import AppError from '../utils/appError.js';

export default function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
