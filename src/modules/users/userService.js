// Business logic for users: admin listing, activate/deactivate, and "my profile".
import User from '../../database/models/userModel.js';
import AppError from '../../utils/appError.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { parsePagination, buildPagination, searchRegex } from '../../utils/query.js';

class UserService {
  // The only user fields that may leave the server. The password hash is never one of them.
  static toPublicUser(user) {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Admin: list users with optional role / active / search filters.
  static async listUsers(query) {
    const filter = {};
    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.search) {
      const regex = searchRegex(query.search);
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const page = parsePagination(query);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit),
      User.countDocuments(filter),
    ]);
    return { users, pagination: buildPagination(page, total) };
  }

  static async getUserById(id) {
    const user = await User.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return user;
  }

  // Admin: activate or deactivate an account.
  static async setUserActive(id, isActive, actingUser) {
    const isSelf = String(actingUser._id) === String(id);
    if (isSelf && !isActive) {
      throw AppError.badRequest('You cannot deactivate your own account');
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!user) throw AppError.notFound('User not found');
    return user;
  }

  // Logged-in user: change own name and/or password.
  static async updateProfile(userId, { name, password, currentPassword }) {
    const user = await User.findById(userId).select('+password');

    if (name) user.name = name;

    if (password) {
      const isCurrentPasswordOk = await verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordOk) throw AppError.badRequest('Current password is incorrect');
      user.password = await hashPassword(password);
    }

    await user.save();
    return UserService.toPublicUser(user);
  }

}

export default UserService;
