// Business logic for users: admin listing, activate/deactivate, and "my profile".
import User from './user.model.js';
import AppError from '../../shared/utils/AppError.js';
import { parsePagination, buildPagination, searchRegex } from '../../shared/utils/query.js';

class UserService {
  // Admin: list users with optional role / active / search filters.
  async list(query) {
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

  async getById(id) {
    const user = await User.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return user;
  }

  // Admin: activate or deactivate an account.
  async setActive(id, isActive, actingUser) {
    const isSelf = String(actingUser._id) === String(id);
    if (isSelf && !isActive) {
      throw AppError.badRequest('You cannot deactivate your own account');
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!user) throw AppError.notFound('User not found');
    return user;
  }

  // Logged-in user: change own name and/or password.
  async updateProfile(userId, { name, password, currentPassword }) {
    const user = await User.findById(userId).select('+password');

    if (name) user.name = name;

    if (password) {
      const currentOk = await user.comparePassword(currentPassword);
      if (!currentOk) throw AppError.badRequest('Current password is incorrect');
      user.password = password; // hashed automatically before saving
    }

    await user.save();
    return user;
  }
}

export default new UserService();
