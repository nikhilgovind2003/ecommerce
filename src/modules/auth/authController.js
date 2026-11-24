// Handles HTTP for /api/auth: reads the request, calls the service, sends the response.
import asyncHandler from '../../utils/asyncHandler.js';
import AuthService from './authService.js';

class AuthController {
  static register = asyncHandler(async function (req, res) {
    const result = await AuthService.register(req.body);
    res.status(201).json({ status: 'success', message: 'Registered successfully', data: result });
  });

  static login = asyncHandler(async function (req, res) {
    const result = await AuthService.login(req.body);
    res.status(200).json({ status: 'success', message: 'Logged in successfully', data: result });
  });

  // req.user was set by requireAuth
  static me = function (req, res) {
    res.status(200).json({ status: 'success', message: 'Profile fetched successfully', data: req.user });
  };
}

export default AuthController;
