// Handles HTTP for /api/auth: reads the request, calls the service, sends the response.
import BaseController from '../../shared/BaseController.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import authService from './auth.service.js';

class AuthController extends BaseController {
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    this.created(res, result);
  });

  login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    this.ok(res, result);
  });

  // req.user was set by requireAuth
  me = (req, res) => {
    this.ok(res, req.user);
  };
}

export default new AuthController();
