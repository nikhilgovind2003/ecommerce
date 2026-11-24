const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

module.exports = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) throw AppError.unauthorized();

  // jwt errors (expired / malformed) are mapped to 401 by the error handler
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id);
  if (!user) throw AppError.unauthorized('User no longer exists');
  if (!user.isActive) throw AppError.forbidden('Your account has been deactivated');

  req.user = user;
  next();
});
