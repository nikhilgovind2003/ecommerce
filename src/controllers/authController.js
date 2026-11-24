const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

const authResponse = (user) => ({ token: signToken(user), user });

// Role is never read from the body: public sign-ups are always customers.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw AppError.conflict('Email already registered');
  const user = await User.create({ name, email, password, role: 'customer' });
  res.status(201).json({ status: 'success', data: authResponse(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw AppError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw AppError.forbidden('Your account has been deactivated');
  res.json({ status: 'success', data: authResponse(user) });
});

exports.me = (req, res) => res.json({ status: 'success', data: { user: req.user } });
