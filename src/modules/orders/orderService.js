// Business logic for orders: placing an order, reading orders, and changing their status.
//
// Placing an order, step by step:
//   1. Merge duplicate lines and check every product exists with enough stock (friendly error list).
//   2. Take the stock one product at a time with an atomic update ('only if enough is left').
//      Two customers racing for the last item can never both get it.
//   3. Create the order. Prices always come from the database, never from the client.
//   4. If anything fails, put the stock we already took back.
import Order from '../../database/models/orderModel.js';
import Product from '../../database/models/productModel.js';
import AppError from '../../utils/appError.js';
import { parsePagination, buildPagination } from '../../utils/query.js';

// Which status may follow which. An empty list means the order is finished.
const NEXT_STATUSES = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/* ---------- placing an order ---------- */

class OrderService {
  static async createOrder(userId, { items, shippingAddress }) {
    const lines = OrderService.mergeDuplicateLines(items);
    await OrderService.checkAvailability(lines);

    const reserved = []; // { line, product } for every line whose stock we already took
    try {
      for (const line of lines) {
        const product = await OrderService.takeStock(line);
        if (!product) {
          throw AppError.conflict(
            `Stock changed while placing the order for product ${line.product}. Please review your cart and try again`,
          );
        }
        reserved.push({ line, product });
      }

      const orderData = OrderService.buildOrderData(userId, reserved, shippingAddress);
      return await Order.create(orderData);
    } catch (err) {
      // Something went wrong: give back whatever we already took.
      const reservedLines = reserved.map(function (r) {
        return r.line;
      });
      await OrderService.giveBackStock(reservedLines).catch(function (e) {
        console.error('Failed to restore stock', e);
      });
      throw err;
    }
  }

  // [{product: A, quantity: 1}, {product: A, quantity: 2}]  ->  [{product: A, quantity: 3}]
  static mergeDuplicateLines(items) {
    const quantityByProduct = new Map();
    items.forEach(function ({ product, quantity }) {
      const id = String(product);
      quantityByProduct.set(
        id,
        (quantityByProduct.get(id) || 0) + Number(quantity),
      );
    });
    return [...quantityByProduct].map(function ([product, quantity]) {
      return {
        product,
        quantity,
      };
    });
  }

  // Checks all items first so the customer sees every problem at once, not one at a time.
  static async checkAvailability(lines) {
    const ids = lines.map(function (line) { return line.product; });
    const products = await Product.find({ _id: { $in: ids } }).select(
      'name stock status',
    );
    const productById = new Map(products.map(function (p) { return [String(p._id), p]; }));

    const problems = [];
    for (const line of lines) {
      const product = productById.get(String(line.product));

      if (!product || product.status !== 'active') {
        problems.push({
          product: line.product,
          message: 'Product is not available',
        });
      } else if (product.stock < line.quantity) {
        problems.push({
          product: line.product,
          message: `Only ${product.stock} left in stock for '${product.name}' (requested ${line.quantity})`,
        });
      }
    }

    if (problems.length > 0)
      throw AppError.badRequest('Some items cannot be ordered', problems);
  }

  // Lowers the stock only if enough is still there, in one atomic step.
  // Returns the updated product, or null when there was not enough stock.
  static takeStock(line) {
    return Product.findOneAndUpdate(
      { _id: line.product, status: 'active', stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } },
      { returnDocument: 'after' },
    );
  }

  // Adds stock back. `lines` is anything shaped like [{ product, quantity }] (also works for order.items).
  static giveBackStock(lines) {
    if (lines.length === 0) return null;

    const updates = lines.map(function (line) {
      return {
        updateOne: {
          filter: { _id: line.product },
          update: { $inc: { stock: line.quantity } },
        },
      };
    });
    return Product.bulkWrite(updates);
  }

  // Builds the order document. Name, SKU and price are copied from the product as it was
  // when the stock was taken, so later price changes never alter an old order.
  static buildOrderData(userId, reserved, shippingAddress) {
    let totalCents = 0;

    const items = reserved.map(function ({ line, product }) {
      // Money is counted in whole cents to avoid floating point errors (0.1 + 0.2 = 0.30000000000000004).
      const subtotalCents =
        Math.round(product.effectivePrice * 100) * line.quantity;
      totalCents += subtotalCents;

      return {
        product: product._id,
        name: product.name,
        sku: product.sku,
        price: product.effectivePrice,
        quantity: line.quantity,
        subtotal: subtotalCents / 100,
      };
    });

    return {
      user: userId,
      items,
      totalAmount: totalCents / 100,
      shippingAddress,
      status: 'pending',
      statusHistory: [{ status: 'pending', changedBy: userId }],
    };
  }

  /* ---------- reading orders ---------- */
  // A customer's own orders.
  static async listForUser(userId, query) {
    const filter = { user: userId };
    if (query.status) filter.status = query.status;

    const page = parsePagination(query);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit),
      Order.countDocuments(filter),
    ]);
    return { orders, pagination: buildPagination(page, total) };
  }

  // Admin: every order, optionally filtered by status or customer.
  static async listAll(query) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.user) filter.user = query.user;

    const page = parsePagination(query);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit),
      Order.countDocuments(filter),
    ]);
    return { orders, pagination: buildPagination(page, total) };
  }

  // Pass userId to only look inside that customer's orders.
  // Someone else's order then simply 'does not exist' (404), so ids can't be guessed.
  static async getById(id, { userId } = {}) {
    const filter = { _id: id };
    if (userId) filter.user = userId;

    const order = await Order.findOne(filter).populate('user', 'name email');
    if (!order) throw AppError.notFound('Order not found');
    return order;
  }

  /* ---------- changing the status ---------- */

  // Used by admins (any allowed step) and by customers cancelling their own order.
  static async changeStatus(id, newStatus, { actorId, userId, note, onlyFrom } = {}) {
    const order = await OrderService.getById(id, { userId });

    if (onlyFrom && !onlyFrom.includes(order.status)) {
      throw AppError.badRequest(
        `Only ${onlyFrom.join('/')} orders can be changed that way (current status: ${order.status})`,
      );
    }

    const allowed = NEXT_STATUSES[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw AppError.badRequest(
        `Cannot change order status from ${order.status} to ${newStatus}`,
      );
    }

    // Only update if the status is still what we just read. If someone else changed it in the
    // meantime (for example a double click on 'cancel'), that finds nothing and we stop,
    // so the stock can never be given back twice.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      {
        $set: { status: newStatus },
        $push: {
          statusHistory: {
            status: newStatus,
            changedBy: actorId,
            note,
            changedAt: new Date(),
          },
        },
      },
    );
    if (!updated) {
      throw AppError.conflict(
        'Order was updated by someone else. Please reload and try again',
      );
    }

    if (newStatus === 'cancelled') await OrderService.giveBackStock(order.items);

    return OrderService.getById(id, { userId });
  }

  // A customer may cancel their own order, but only while it is still pending.
  static cancelOwnOrder(id, user) {
    return OrderService.changeStatus(id, 'cancelled', {
      actorId: user._id,
      userId: user._id,
      note: 'Cancelled by customer',
      onlyFrom: ['pending'],
    });
  }
}

export default OrderService;
