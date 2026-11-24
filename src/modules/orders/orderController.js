// Handles HTTP for /api/orders. Customer endpoints are under /my, admin endpoints are the rest.
import asyncHandler from '../../utils/asyncHandler.js';
import OrderService from './orderService.js';

class OrderController {
  /* ---------- customer ---------- */

  static create = asyncHandler(async function (req, res) {
    // Only product ids, quantities and the address are read. Prices and totals never come from the client.
    const { items, shippingAddress } = req.body;
    const order = await OrderService.createOrder(req.user._id, { items, shippingAddress });
    res.status(201).json({ status: 'success', message: 'Order placed successfully', data: order });
  });

  static listMine = asyncHandler(async function (req, res) {
    const { orders, pagination } = await OrderService.listForUser(req.user._id, req.query);
    res.status(200).json({ status: 'success', message: 'Orders fetched successfully', data: orders, pagination });
  });

  static getMine = asyncHandler(async function (req, res) {
    const order = await OrderService.getById(req.params.id, { userId: req.user._id });
    res.status(200).json({ status: 'success', message: 'Order fetched successfully', data: order });
  });

  static cancelMine = asyncHandler(async function (req, res) {
    const order = await OrderService.cancelOwnOrder(req.params.id, req.user);
    res.status(200).json({ status: 'success', message: 'Order cancelled successfully', data: order });
  });

  /* ---------- admin ---------- */

  static listAll = asyncHandler(async function (req, res) {
    const { orders, pagination } = await OrderService.listAll(req.query);
    res.status(200).json({ status: 'success', message: 'Orders fetched successfully', data: orders, pagination });
  });

  static getOne = asyncHandler(async function (req, res) {
    const order = await OrderService.getById(req.params.id);
    res.status(200).json({ status: 'success', message: 'Order fetched successfully', data: order });
  });

  static updateStatus = asyncHandler(async function (req, res) {
    const { status, note } = req.body;
    const order = await OrderService.changeStatus(req.params.id, status, { actorId: req.user._id, note });
    res.status(200).json({ status: 'success', message: `Order status updated to ${status}`, data: order });
  });
}

export default OrderController;
