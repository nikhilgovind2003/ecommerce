const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');

exports.tree = asyncHandler(async (req, res) => {
  // admins can ask for inactive branches too
  const includeInactive = req.user?.role === 'admin' && req.query.includeInactive === 'true';
  res.json({ status: 'success', data: await categoryService.getTree({ includeInactive }) });
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await categoryService.list(req.query) });
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await categoryService.getById(req.params.id) });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', data: await categoryService.create(req.body) });
});

exports.update = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await categoryService.update(req.params.id, req.body) });
});

exports.remove = asyncHandler(async (req, res) => {
  await categoryService.remove(req.params.id);
  res.status(204).end();
});
