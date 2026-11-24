// Sign-up, login and token creation.
import jwt from 'jsonwebtoken';
import User from '../../database/models/userModel.js';
import UserService from '../users/userService.js';
import AppError from '../../utils/appError.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';

class AuthService {
  // A signed JWT that carries the user id and role.
  static signToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
  }

  // What register and login send back.
  static buildAuthResult(user) {
    return { token: AuthService.signToken(user), user: UserService.toPublicUser(user) };
  }

  // Public sign-up always makes a customer. The role is never read from the request.
  static async register({ name, email, password }) {
    const isEmailUsed = await User.exists({ email });
    if (isEmailUsed) throw AppError.conflict('Email already registered');

    const user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: 'customer',
    });
    return AuthService.buildAuthResult(user);
  }

  static async login({ email, password }) {
    // The password field is hidden by default, so ask for it explicitly.
    const user = await User.findOne({ email }).select('+password');

    // Same message for "no such user" and "wrong password", so nobody can probe which emails exist.
    const isPasswordOk = user ? await verifyPassword(password, user.password) : false;
    if (!isPasswordOk) throw AppError.unauthorized('Invalid email or password');

    if (!user.isActive) throw AppError.forbidden('Your account has been deactivated');
    return AuthService.buildAuthResult(user);
  }

}

export default AuthService;
