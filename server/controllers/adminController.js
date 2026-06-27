import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { deleteCloudinaryImage } from '../config/cloudinary.js';
import { sendVendorApprovedEmail, sendVendorRejectedEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
export const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalVendors,
    pendingVendors,
    totalProducts,
    totalOrders,
    revenueResult,
    recentOrders,
    revenueByMonth,
    userGrowth,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'vendor', 'vendorInfo.applicationStatus': 'approved' }),
    User.countDocuments({ role: 'vendor', 'vendorInfo.applicationStatus': 'pending' }),
    Product.countDocuments({ isPublished: true }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, platformRevenue: { $sum: { $multiply: ['$totalAmount', '$platformCommissionRate'] } } } },
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customer', 'name email')
      .select('orderNumber status totalAmount createdAt isPaid'),
    Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
    User.aggregate([
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          users: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalVendors,
      pendingVendors,
      totalProducts,
      totalOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      platformRevenue: revenueResult[0]?.platformRevenue || 0,
    },
    recentOrders,
    revenueByMonth,
    userGrowth,
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password -refreshToken -passwordResetToken'),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ success: true, user });
});

// ─── PATCH /api/admin/users/:id/toggle-active ─────────────────────────────────
export const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot deactivate an admin account');
  }

  user.isActive = !user.isActive;
  // Invalidate any active sessions
  if (!user.isActive) user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
    isActive: user.isActive,
  });
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot delete an admin account');
  }

  // Unpublish all products if vendor
  if (user.role === 'vendor') {
    await Product.updateMany({ vendor: user._id }, { isPublished: false });
  }

  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});

// ─── GET /api/admin/vendors/pending ───────────────────────────────────────────
export const getPendingVendors = asyncHandler(async (req, res) => {
  const vendors = await User.find({
    role: 'vendor',
    'vendorInfo.applicationStatus': 'pending',
  })
    .sort({ createdAt: -1 })
    .select('name email vendorInfo createdAt');

  res.json({ success: true, vendors });
});

// ─── PATCH /api/admin/vendors/:id/approve ────────────────────────────────────
export const approveVendor = asyncHandler(async (req, res) => {
  const { note } = req.body;

  const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  vendor.vendorInfo.applicationStatus = 'approved';
  if (note) vendor.vendorInfo.applicationNote = note;
  vendor.markModified('vendorInfo');
  await vendor.save({ validateBeforeSave: false });

  sendVendorApprovedEmail({ to: vendor.email, name: vendor.name, shopName: vendor.vendorInfo.shopName })
    .catch((err) => logger.error(`Vendor approved email failed: ${err.message}`));

  res.json({ success: true, message: `Vendor "${vendor.vendorInfo.shopName}" approved` });
});

// ─── PATCH /api/admin/vendors/:id/reject ─────────────────────────────────────
export const rejectVendor = asyncHandler(async (req, res) => {
  const { note } = req.body;

  const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  vendor.vendorInfo.applicationStatus = 'rejected';
  vendor.vendorInfo.applicationNote = note || 'Application rejected';
  vendor.markModified('vendorInfo');
  await vendor.save({ validateBeforeSave: false });

  sendVendorRejectedEmail({ to: vendor.email, name: vendor.name, shopName: vendor.vendorInfo.shopName, note })
    .catch((err) => logger.error(`Vendor rejected email failed: ${err.message}`));

  res.json({ success: true, message: `Vendor "${vendor.vendorInfo.shopName}" rejected` });
});

// ─── GET /api/admin/products ──────────────────────────────────────────────────
export const getAllProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.isApproved !== undefined) filter.isApproved = req.query.isApproved === 'true';
  if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === 'true';
  if (req.query.vendor) filter.vendor = req.query.vendor;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-reviews -reviewSummary -costPrice')
      .populate('vendor', 'name email vendorInfo.shopName'),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ─── PATCH /api/admin/products/:id/approve ───────────────────────────────────
export const approveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  product.isApproved = true;
  await product.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Product approved' });
});

// ─── PATCH /api/admin/products/:id/reject ────────────────────────────────────
export const rejectProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  product.isApproved = false;
  product.isPublished = false;
  await product.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Product rejected and unpublished' });
});

// ─── DELETE /api/admin/products/:id ──────────────────────────────────────────
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  await Promise.all(product.images.map((img) => deleteCloudinaryImage(img.publicId)));
  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted' });
});

// ─── GET /api/admin/categories ────────────────────────────────────────────────
// Aggregated category stats (count of active products per category)
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $match: { isPublished: true, isApproved: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        avgRating: { $avg: '$rating' },
      },
    },
    { $sort: { count: -1 } },
    { $project: { category: '$_id', count: 1, avgPrice: 1, avgRating: 1, _id: 0 } },
  ]);

  res.json({ success: true, categories });
});

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
export const getAllOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.isPaid !== undefined) filter.isPaid = req.query.isPaid === 'true';

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name email')
      .populate('items.vendor', 'name vendorInfo.shopName'),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ─── PATCH /api/admin/orders/:id/status ───────────────────────────────────────
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const VALID = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
  if (!VALID.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }

  order.status = status;
  order.addTrackingEvent(`Admin updated status to ${status}`, status);
  await order.save();

  res.json({ success: true, status: order.status });
});
