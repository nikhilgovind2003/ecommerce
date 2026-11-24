// Handles HTTP for /api/users.
import asyncHandler from '../../utils/asyncHandler.js';
import UserService from './userService.js';

class UserController {
  static list = asyncHandler(async function (req, res) {
    const { users, pagination } = await UserService.listUsers(req.query);
    res.status(200).json({ status: 'success', message: 'Users fetched successfully', data: users, pagination });
  });

  static getOne = asyncHandler(async function (req, res) {
    const user = await UserService.getUserById(req.params.id);
    res.status(200).json({ status: 'success', message: 'User fetched successfully', data: user });
  });

  static setStatus = asyncHandler(async function (req, res) {
    const user = await UserService.setUserActive(req.params.id, req.body.isActive, req.user);
    const message = user.isActive ? 'User activated successfully' : 'User deactivated successfully';
    res.status(200).json({ status: 'success', message, data: user });
  });

  static updateMe = asyncHandler(async function (req, res) {
    const user = await UserService.updateProfile(req.user._id, req.body);
    res.status(200).json({ status: 'success', message: 'Profile updated successfully', data: user });
  });
}

export default UserController;
