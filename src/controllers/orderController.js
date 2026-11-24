const orderService = require('../services/orderService');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  // only product ids, quantities and the address are read: prices and totals are never taken from the client
  const { items, shippingAddress } = req.body;
  const order = await orderService.createOrder(req.user._id, { items, shippingAddress });
  res.status(201).json({ status: 'success', data: order });
});

exports.listMine = asyncHandler(async (req, res) => {
  const { orders, pagination } = await orderService.listForUser(req.user._id, req.query);
  res.json({ status: 'success', data: orders, pagination });
});

exports.getMine = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await orderService.getById(req.params.id, { userId: req.user._id }) });
});

exports.cancelMine = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await orderService.cancelOwnOrder(req.params.id, req.user) });
});

exports.listAll = asyncHandler(async (req, res) => {
  const { orders, pagination } = await orderService.listAll(req.query);
  res.json({ status: 'success', data: orders, pagination });
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await orderService.getById(req.params.id) });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.changeStatus(req.params.id, req.body.status, {
    actorId: req.user._id,
    note: req.body.note,
  });
  res.json({ status: 'success', data: order });
});
