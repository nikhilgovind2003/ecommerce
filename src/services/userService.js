const User = require('../models/User');
const AppError = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/pagination');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = async (query) => {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.search) {
    const re = new RegExp(escapeRegex(String(query.search)), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }

  const pageInfo = parsePagination(query);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    User.countDocuments(filter),
  ]);
  return { users, pagination: buildPagination(pageInfo, total) };
};

exports.getById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found');
  return user;
};

exports.setActive = async (id, isActive, actingUser) => {
  if (String(actingUser._id) === String(id) && !isActive) {
    throw AppError.badRequest('You cannot deactivate your own account');
  }
  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!user) throw AppError.notFound('User not found');
  return user;
};

exports.updateProfile = async (userId, { name, password, currentPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (name) user.name = name;
  if (password) {
    if (!(await user.comparePassword(currentPassword))) {
      throw AppError.badRequest('Current password is incorrect');
    }
    user.password = password; // hashed by the pre-save hook
  }
  await user.save();
  return user;
};
