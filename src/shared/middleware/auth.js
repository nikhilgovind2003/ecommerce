// Login checks. Both read the JWT from "Authorization: Bearer <token>" (or the "token" cookie).
import jwt from 'jsonwebtoken';
import User from '../../modules/users/user.model.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const getToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.token;
};

// Blocks the request unless the caller is logged in. Sets req.user.
// An expired or fake token throws here; the error handler turns it into a 401.
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) throw AppError.unauthorized();

  const { id } = jwt.verify(token, process.env.JWT_SECRET);

  // The user is loaded on every request, so a deactivated account is blocked immediately.
  const user = await User.findById(id);
  if (!user) throw AppError.unauthorized('User no longer exists');
  if (!user.isActive) throw AppError.forbidden('Your account has been deactivated');

  req.user = user;
  next();
});

// For public pages that look a bit different for admins (for example inactive categories).
// Sets req.user when the token is good, and never blocks the request.
export const optionalAuth = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(id);
      if (user && user.isActive) req.user = user;
    }
  } catch {
    // A bad token on a public page is treated as "not logged in".
  }
  next();
};
