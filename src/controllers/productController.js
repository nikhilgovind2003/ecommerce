const productService = require('../services/productService');
const asyncHandler = require('../utils/asyncHandler');

const listHandler = (adminView) =>
  asyncHandler(async (req, res) => {
    const { products, pagination } = await productService.list(req.query, { adminView });
    res.json({ status: 'success', data: products, pagination });
  });

exports.list = listHandler(false);
exports.adminList = listHandler(true);

exports.getOne = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id, { adminView: req.user?.role === 'admin' });
  res.json({ status: 'success', data: product });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', data: await productService.create(req.body) });
});

exports.update = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await productService.update(req.params.id, req.body) });
});

exports.remove = asyncHandler(async (req, res) => {
  await productService.remove(req.params.id);
  res.status(204).end();
});
