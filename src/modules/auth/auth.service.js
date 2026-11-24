// Sign-up, login and token creation.
import jwt from 'jsonwebtoken';
import User from '../users/user.model.js';
import AppError from '../../shared/utils/AppError.js';

class AuthService {
  // A signed JWT that carries the user id and role.
  signToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
  }

  // What register and login send back.
  buildAuthResult(user) {
    return { token: this.signToken(user), user };
  }

  // Public sign-up always makes a customer. The role is never read from the request.
  async register({ name, email, password }) {
    const alreadyUsed = await User.exists({ email });
    if (alreadyUsed) throw AppError.conflict('Email already registered');

    const user = await User.create({ name, email, password, role: 'customer' });
    return this.buildAuthResult(user);
  }

  async login({ email, password }) {
    // The password field is hidden by default, so ask for it explicitly.
    const user = await User.findOne({ email }).select('+password');

    // Same message for "no such user" and "wrong password", so nobody can probe which emails exist.
    const passwordOk = user ? await user.comparePassword(password) : false;
    if (!passwordOk) throw AppError.unauthorized('Invalid email or password');

    if (!user.isActive) throw AppError.forbidden('Your account has been deactivated');
    return this.buildAuthResult(user);
  }
}

export default new AuthService();
