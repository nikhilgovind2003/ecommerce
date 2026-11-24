const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { users, pagination } = await userService.list(req.query);
  res.json({ status: 'success', data: users, pagination });
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await userService.getById(req.params.id) });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const user = await userService.setActive(req.params.id, req.body.isActive, req.user);
  res.json({ status: 'success', data: user });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.json({ status: 'success', data: user });
});
