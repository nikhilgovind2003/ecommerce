// Handles HTTP for /api/orders. Customer endpoints are under /my, admin endpoints are the rest.
import BaseController from '../../shared/BaseController.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import orderService from './order.service.js';

class OrderController extends BaseController {
  /* ---------- customer ---------- */

  create = asyncHandler(async (req, res) => {
    // Only product ids, quantities and the address are read. Prices and totals never come from the client.
    const { items, shippingAddress } = req.body;
    const order = await orderService.createOrder(req.user._id, { items, shippingAddress });
    this.created(res, order);
  });

  listMine = asyncHandler(async (req, res) => {
    const { orders, pagination } = await orderService.listForUser(req.user._id, req.query);
    this.ok(res, orders, pagination);
  });

  getMine = asyncHandler(async (req, res) => {
    this.ok(res, await orderService.getById(req.params.id, { userId: req.user._id }));
  });

  cancelMine = asyncHandler(async (req, res) => {
    this.ok(res, await orderService.cancelOwnOrder(req.params.id, req.user));
  });

  /* ---------- admin ---------- */

  listAll = asyncHandler(async (req, res) => {
    const { orders, pagination } = await orderService.listAll(req.query);
    this.ok(res, orders, pagination);
  });

  getOne = asyncHandler(async (req, res) => {
    this.ok(res, await orderService.getById(req.params.id));
  });

  updateStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const order = await orderService.changeStatus(req.params.id, status, { actorId: req.user._id, note });
    this.ok(res, order);
  });
}

export default new OrderController();
