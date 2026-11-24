// Handles HTTP for /api/users.
import BaseController from '../../shared/BaseController.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import userService from './user.service.js';

class UserController extends BaseController {
  list = asyncHandler(async (req, res) => {
    const { users, pagination } = await userService.list(req.query);
    this.ok(res, users, pagination);
  });

  getOne = asyncHandler(async (req, res) => {
    this.ok(res, await userService.getById(req.params.id));
  });

  setStatus = asyncHandler(async (req, res) => {
    const user = await userService.setActive(req.params.id, req.body.isActive, req.user);
    this.ok(res, user);
  });

  updateMe = asyncHandler(async (req, res) => {
    this.ok(res, await userService.updateProfile(req.user._id, req.body));
  });
}

export default new UserController();
