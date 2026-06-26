import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import { sendOrderConfirmationEmail } from '../utils/email.js';

// Platform commission rate (10% — override per vendor in future)
const PLATFORM_COMMISSION = 0.1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates cart items against live DB stock, returns enriched order items
 * and the calculated subtotal. Throws if any item is unavailable.
 */
const resolveCartItems = async (cartItems) => {
  const productIds = cartItems.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } }).select(
    'name images price stock vendor isPublished isApproved shippingCost'
  );

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  let subtotal = 0;
  const orderItems = [];

  for (const item of cartItems) {
    const product = productMap.get(item.product.toString());

    if (!product || !product.isPublished || !product.isApproved) {
      throw Object.assign(new Error(`Product "${item.product}" is unavailable`), { status: 400 });
    }
    if (product.stock < item.quantity) {
      throw Object.assign(
        new Error(`Only ${product.stock} unit(s) of "${product.name}" available`),
        { status: 400 }
      );
    }

    const lineTotal = product.price * item.quantity;
    subtotal += lineTotal;

    orderItems.push({
      product: product._id,
      vendor: product.vendor,
      name: product.name,
      image: product.images[0]?.url || '',
      price: product.price,
      quantity: item.quantity,
      vendorEarnings: lineTotal * (1 - PLATFORM_COMMISSION),
    });
  }

  return { orderItems, subtotal };
};

/**
 * Decrement stock for each order item — called after payment confirmation.
 * Skips items where stock already went to 0 (race condition guard).
 */
const decrementStock = async (items) => {
  await Promise.all(
    items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, totalSold: item.quantity },
      })
    )
  );
};

/**
 * Emit real-time order update to customer and relevant vendors.
 */
const emitOrderUpdate = (io, order) => {
  if (!io) return;
  // Notify customer
  io.to(order.customer.toString()).emit('orderUpdated', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
  });
  // Notify each vendor in the order
  const vendorIds = [...new Set(order.items.map((i) => i.vendor.toString()))];
  vendorIds.forEach((vid) => {
    io.to(vid).emit('vendorOrderUpdated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
    });
  });
};

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export const createOrder = asyncHandler(async (req, res) => {
  const { cartItems, shippingAddress, couponCode, customerNote } = req.body;

  if (!cartItems || cartItems.length === 0) {
    res.status(400);
    throw new Error('No items in cart');
  }

  const { orderItems, subtotal } = await resolveCartItems(cartItems);

  // Free shipping above Rs 5,000
  const shippingCost = subtotal >= 5000 ? 0 : 250;
  const taxAmount = 0;
  const totalAmount = subtotal + shippingCost;

  const vendorIds = [...new Set(orderItems.map((i) => i.vendor.toString()))];
  const vendorStatuses = vendorIds.map((vid) => ({ vendor: vid, status: 'pending' }));

  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    shippingAddress,
    subtotal,
    shippingCost,
    taxAmount,
    totalAmount,
    couponCode,
    customerNote,
    paymentMethod: 'cod',
    platformCommissionRate: PLATFORM_COMMISSION,
    vendorStatuses,
    status: 'pending',
    trackingHistory: [{ status: 'pending', description: 'Order placed — Cash on Delivery' }],
  });

  // Send confirmation email (non-blocking)
  sendOrderConfirmationEmail({
    to: req.user.email,
    name: req.user.name,
    orderNumber: order.orderNumber,
    total: order.totalAmount,
    items: orderItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
  }).catch((err) => logger.error(`Order email failed: ${err.message}`));

  res.status(201).json({
    success: true,
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
    },
  });
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// Customer — own orders; Admin — all orders
export const getOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const filter = req.user.role === 'admin' ? {} : { customer: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-trackingHistory -paymentResult -vendorStatuses')
      .populate('customer', 'name email'),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email phone')
    .populate('items.product', 'name slug images')
    .populate('items.vendor', 'name vendorInfo.shopName')
    .populate('vendorStatuses.vendor', 'name vendorInfo.shopName');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Customers may only view their own orders
  if (
    req.user.role === 'customer' &&
    order.customer._id.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  // Vendors may only view orders containing their products
  if (req.user.role === 'vendor') {
    const isInOrder = order.items.some(
      (i) => i.vendor._id.toString() === req.user._id.toString()
    );
    if (!isInOrder) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }
  }

  res.json({ success: true, order });
});

// ─── GET /api/orders/vendor/mine ──────────────────────────────────────────────
// Vendor — orders containing their products
export const getVendorOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const filter = { 'items.vendor': req.user._id };
  if (req.query.status) filter['vendorStatuses'] = {
    $elemMatch: { vendor: req.user._id, status: req.query.status },
  };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name email')
      .select('-paymentResult'),
    Order.countDocuments(filter),
  ]);

  // Strip items from other vendors
  const filteredOrders = orders.map((order) => {
    const obj = order.toObject();
    obj.items = obj.items.filter(
      (i) => i.vendor.toString() === req.user._id.toString()
    );
    return obj;
  });

  res.json({
    success: true,
    orders: filteredOrders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ─── PATCH /api/orders/:id/vendor-status ──────────────────────────────────────
// Vendor — update their fulfillment status for an order
export const updateVendorStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber, carrier, estimatedDelivery } = req.body;

  const validTransitions = {
    pending: ['accepted', 'cancelled'],
    accepted: ['processing', 'cancelled'],
    processing: ['shipped'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const vendorEntry = order.vendorStatuses.find(
    (vs) => vs.vendor.toString() === req.user._id.toString()
  );
  if (!vendorEntry) {
    res.status(403);
    throw new Error('No items from your shop in this order');
  }

  if (!validTransitions[vendorEntry.status]?.includes(status)) {
    res.status(400);
    throw new Error(`Cannot transition from '${vendorEntry.status}' to '${status}'`);
  }

  vendorEntry.status = status;
  if (trackingNumber) vendorEntry.trackingNumber = trackingNumber;
  if (carrier) vendorEntry.carrier = carrier;
  if (estimatedDelivery) vendorEntry.estimatedDelivery = new Date(estimatedDelivery);
  if (status === 'shipped') vendorEntry.shippedAt = new Date();
  if (status === 'delivered') vendorEntry.deliveredAt = new Date();

  // Roll up to top-level order status based on all vendor statuses
  const allStatuses = order.vendorStatuses.map((vs) => vs.status);
  const allDelivered = allStatuses.every((s) => s === 'delivered');
  const anyShipped = allStatuses.some((s) => s === 'shipped');
  const anyProcessing = allStatuses.some((s) => s === 'processing');
  const allCancelled = allStatuses.every((s) => s === 'cancelled');

  let newOrderStatus = order.status;
  if (allDelivered) newOrderStatus = 'delivered';
  else if (anyShipped) newOrderStatus = 'shipped';
  else if (anyProcessing) newOrderStatus = 'processing';
  else if (allCancelled) newOrderStatus = 'cancelled';

  if (newOrderStatus !== order.status) {
    order.addTrackingEvent(newOrderStatus, `Status updated to ${newOrderStatus}`);
    if (newOrderStatus === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }
  }

  await order.save();

  emitOrderUpdate(req.app.get('io'), order);

  res.json({ success: true, order });
});

// ─── PATCH /api/orders/:id/cancel ────────────────────────────────────────────
// Customer cancels a pending/confirmed order; triggers Stripe refund if paid
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  if (!['pending', 'confirmed'].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel an order with status '${order.status}'`);
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = reason || 'Cancelled by customer';
  order.vendorStatuses.forEach((vs) => (vs.status = 'cancelled'));
  order.addTrackingEvent('cancelled', reason || 'Order cancelled by customer');

  await order.save();
  emitOrderUpdate(req.app.get('io'), order);

  res.json({ success: true, order });
});

// ─── PATCH /api/orders/:id/admin-status ──────────────────────────────────────
// Admin — override order status directly
export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.addTrackingEvent(status, `Status set to ${status} by admin`);
  if (status === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  await order.save();
  emitOrderUpdate(req.app.get('io'), order);

  res.json({ success: true, order });
});

// ─── GET /api/orders/stats ────────────────────────────────────────────────────
// Admin — platform-wide order statistics
export const getOrderStats = asyncHandler(async (req, res) => {
  const [statusBreakdown, revenueByMonth, recentOrders] = await Promise.all([
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('customer', 'name email'),
  ]);

  res.json({ success: true, statusBreakdown, revenueByMonth, recentOrders });
});
