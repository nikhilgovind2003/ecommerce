const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { canTransition } = require('../utils/orderStatus');
const { mergeItems, calculateTotals } = require('../utils/orderCalc');
const { supportsTransactions } = require('../utils/transactions');
const { parsePagination, buildPagination } = require('../utils/pagination');

/* ---------- stock helpers ---------- */

// Atomic "check and decrement": only succeeds if enough stock is still there at this exact moment.
// Two customers racing for the last unit can never both win.
const reserveOne = (line, session) =>
  Product.findOneAndUpdate(
    { _id: line.product, status: 'active', stock: { $gte: line.quantity } },
    { $inc: { stock: -line.quantity } },
    { returnDocument: 'after', session }
  );

const releaseStock = (lines, session) =>
  lines.length
    ? Product.bulkWrite(
        lines.map((l) => ({ updateOne: { filter: { _id: l.product }, update: { $inc: { stock: l.quantity } } } })),
        { session }
      )
    : null;

const stockConflict = (line) =>
  AppError.conflict(`Stock changed while placing the order for product ${line.product}. Please review your cart and try again`);

/* ---------- order creation ---------- */

// Friendly validation up front so the customer gets a clear message about every problem item.
const checkAvailability = async (lines) => {
  const products = await Product.find({ _id: { $in: lines.map((l) => l.product) } }).select('name stock status');
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const problems = [];
  lines.forEach((line) => {
    const p = byId.get(String(line.product));
    if (!p || p.status !== 'active') {
      problems.push({ product: line.product, message: 'Product is not available' });
    } else if (p.stock < line.quantity) {
      problems.push({
        product: line.product,
        message: `Only ${p.stock} left in stock for "${p.name}" (requested ${line.quantity})`,
      });
    }
  });
  if (problems.length) throw AppError.badRequest('Some items cannot be ordered', problems);
};

// Name/SKU/price come from the product document returned by the atomic update,
// i.e. exactly what was current at the moment the stock was reserved.
const buildOrderData = (userId, reserved, shippingAddress) => {
  const { items, totalAmount } = calculateTotals(
    reserved.map(({ line, doc }) => ({
      product: doc._id,
      name: doc.name,
      sku: doc.sku,
      price: doc.effectivePrice,
      quantity: line.quantity,
    }))
  );
  return {
    user: userId,
    items,
    totalAmount,
    shippingAddress,
    status: 'pending',
    statusHistory: [{ status: 'pending', changedBy: userId }],
  };
};

const createWithTransaction = (userId, lines, shippingAddress) =>
  mongoose.connection.transaction(async (session) => {
    // may re-run on transient errors, so state lives inside the callback
    const reserved = [];
    for (const line of lines) {
      const doc = await reserveOne(line, session);
      if (!doc) throw stockConflict(line); // throwing aborts the whole transaction: nothing to undo
      reserved.push({ line, doc });
    }
    const [order] = await Order.create([buildOrderData(userId, reserved, shippingAddress)], { session });
    return order;
  });

// Standalone MongoDB has no transactions: reserve item by item and compensate if anything fails.
const createWithCompensation = async (userId, lines, shippingAddress) => {
  const reserved = [];
  try {
    for (const line of lines) {
      const doc = await reserveOne(line);
      if (!doc) throw stockConflict(line);
      reserved.push({ line, doc });
    }
    return await Order.create(buildOrderData(userId, reserved, shippingAddress));
  } catch (err) {
    await releaseStock(reserved.map((r) => r.line)).catch((e) => console.error('Failed to restore stock', e));
    throw err;
  }
};

exports.createOrder = async (userId, { items, shippingAddress }) => {
  const lines = mergeItems(items);
  await checkAvailability(lines);
  return (await supportsTransactions())
    ? createWithTransaction(userId, lines, shippingAddress)
    : createWithCompensation(userId, lines, shippingAddress);
};

/* ---------- reading ---------- */

exports.listForUser = async (userId, query) => {
  const pageInfo = parsePagination(query);
  const filter = { user: userId };
  if (query.status) filter.status = query.status;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    Order.countDocuments(filter),
  ]);
  return { orders, pagination: buildPagination(pageInfo, total) };
};

exports.listAll = async (query) => {
  const pageInfo = parsePagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.user) filter.user = query.user;
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    Order.countDocuments(filter),
  ]);
  return { orders, pagination: buildPagination(pageInfo, total) };
};

// Passing userId scopes the lookup to that customer, so other people's orders simply "don't exist".
exports.getById = async (id, { userId } = {}) => {
  const filter = { _id: id };
  if (userId) filter.user = userId;
  const order = await Order.findOne(filter).populate('user', 'name email');
  if (!order) throw AppError.notFound('Order not found');
  return order;
};

/* ---------- status changes ---------- */

const applyStatusChange = async (order, newStatus, actorId, note, session) => {
  // The `status: order.status` guard makes this a compare-and-set, so two concurrent
  // updates (e.g. double-cancel) can't both succeed and restore stock twice.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    {
      $set: { status: newStatus },
      $push: { statusHistory: { status: newStatus, changedBy: actorId, note, changedAt: new Date() } },
    },
    { returnDocument: 'after', session }
  );
  if (!updated) throw AppError.conflict('Order was updated by someone else. Please reload and try again');

  if (newStatus === 'cancelled') await releaseStock(order.items, session);
  return updated;
};

exports.changeStatus = async (id, newStatus, { actorId, userId, note, allowedFrom } = {}) => {
  const order = await exports.getById(id, { userId });

  if (allowedFrom && !allowedFrom.includes(order.status)) {
    throw AppError.badRequest(`Only ${allowedFrom.join('/')} orders can be changed this way (current status: ${order.status})`);
  }
  if (!canTransition(order.status, newStatus)) {
    throw AppError.badRequest(`Cannot change order status from ${order.status} to ${newStatus}`);
  }

  const run = (session) => applyStatusChange(order, newStatus, actorId, note, session);
  const updated = (await supportsTransactions()) ? await mongoose.connection.transaction(run) : await run();
  return exports.getById(updated._id, { userId });
};

// Customers may only cancel their own order, and only while it is still pending.
exports.cancelOwnOrder = (id, user) =>
  exports.changeStatus(id, 'cancelled', {
    actorId: user._id,
    userId: user._id,
    note: 'Cancelled by customer',
    allowedFrom: ['pending'],
  });
