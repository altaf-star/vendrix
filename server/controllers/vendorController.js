import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { deleteCloudinaryImage } from '../config/cloudinary.js';

// ─── GET /api/vendor/dashboard ────────────────────────────────────────────────
// Aggregated stats card data + recent orders for the vendor's dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  const [revenueStats, orderStatusBreakdown, topProducts, recentOrders, revenueByMonth] =
    await Promise.all([
      // Lifetime revenue + order count from confirmed/delivered orders
      Order.aggregate([
        { $match: { 'items.vendor': vendorId, isPaid: true } },
        { $unwind: '$items' },
        { $match: { 'items.vendor': vendorId } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$items.vendorEarnings' },
            totalOrders: { $sum: 1 },
            totalUnitsSold: { $sum: '$items.quantity' },
          },
        },
      ]),

      // Order count per status for this vendor
      Order.aggregate([
        { $match: { 'vendorStatuses.vendor': vendorId } },
        { $unwind: '$vendorStatuses' },
        { $match: { 'vendorStatuses.vendor': vendorId } },
        { $group: { _id: '$vendorStatuses.status', count: { $sum: 1 } } },
      ]),

      // Top 5 products by units sold
      Product.find({ vendor: vendorId })
        .sort({ totalSold: -1 })
        .limit(5)
        .select('name images price totalSold rating numReviews stock'),

      // 10 most recent orders
      Order.find({ 'items.vendor': vendorId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber status totalAmount createdAt customer')
        .populate('customer', 'name email'),

      // Revenue per month (last 12 months) for chart
      Order.aggregate([
        { $match: { 'items.vendor': vendorId, isPaid: true } },
        { $unwind: '$items' },
        { $match: { 'items.vendor': vendorId } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$items.vendorEarnings' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
    ]);

  const stats = revenueStats[0] || { totalRevenue: 0, totalOrders: 0, totalUnitsSold: 0 };
  const productCount = await Product.countDocuments({ vendor: vendorId });
  const lowStockCount = await Product.countDocuments({ vendor: vendorId, stock: { $lte: 5, $gt: 0 } });
  const outOfStockCount = await Product.countDocuments({ vendor: vendorId, stock: 0 });

  res.json({
    success: true,
    stats: {
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      totalUnitsSold: stats.totalUnitsSold,
      totalProducts: productCount,
      lowStockCount,
      outOfStockCount,
    },
    orderStatusBreakdown,
    topProducts,
    recentOrders,
    revenueByMonth,
  });
});

// ─── GET /api/vendor/profile ──────────────────────────────────────────────────
export const getVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.user._id).select(
    'name email phone avatar vendorInfo createdAt'
  );
  res.json({ success: true, vendor });
});

// ─── PUT /api/vendor/profile ──────────────────────────────────────────────────
export const updateVendorProfile = asyncHandler(async (req, res) => {
  const {
    name, phone,
    shopName, shopDescription, businessEmail, businessPhone,
    shopLogo, shopBanner,
  } = req.body;

  const vendor = await User.findById(req.user._id);

  if (name) vendor.name = name;
  if (phone !== undefined) vendor.phone = phone;

  if (!vendor.vendorInfo) vendor.vendorInfo = {};
  if (shopName) vendor.vendorInfo.shopName = shopName;
  if (shopDescription !== undefined) vendor.vendorInfo.shopDescription = shopDescription;
  if (businessEmail) vendor.vendorInfo.businessEmail = businessEmail;
  if (businessPhone !== undefined) vendor.vendorInfo.businessPhone = businessPhone;

  // Replace shop logo image (clean up old Cloudinary asset)
  if (shopLogo && shopLogo !== vendor.vendorInfo.shopLogo) {
    if (vendor.vendorInfo.shopLogo?.includes('cloudinary')) {
      const parts = vendor.vendorInfo.shopLogo.split('/');
      await deleteCloudinaryImage(`vendrix/shops/${parts[parts.length - 1].split('.')[0]}`);
    }
    vendor.vendorInfo.shopLogo = shopLogo;
  }

  if (shopBanner && shopBanner !== vendor.vendorInfo.shopBanner) {
    if (vendor.vendorInfo.shopBanner?.includes('cloudinary')) {
      const parts = vendor.vendorInfo.shopBanner.split('/');
      await deleteCloudinaryImage(`vendrix/shops/${parts[parts.length - 1].split('.')[0]}`);
    }
    vendor.vendorInfo.shopBanner = shopBanner;
  }

  vendor.markModified('vendorInfo');
  const updated = await vendor.save();

  res.json({ success: true, vendor: updated.toPublicJSON() });
});

// ─── GET /api/vendor/earnings ─────────────────────────────────────────────────
// Paginated earnings history with per-order breakdown
export const getEarnings = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const vendorId = req.user._id;

  const [earningsData, total, summary] = await Promise.all([
    Order.aggregate([
      { $match: { 'items.vendor': vendorId, isPaid: true } },
      { $unwind: '$items' },
      { $match: { 'items.vendor': vendorId } },
      {
        $project: {
          orderNumber: 1,
          createdAt: 1,
          paidAt: 1,
          status: 1,
          itemName: '$items.name',
          itemQty: '$items.quantity',
          itemPrice: '$items.price',
          vendorEarnings: '$items.vendorEarnings',
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),

    Order.aggregate([
      { $match: { 'items.vendor': vendorId, isPaid: true } },
      { $unwind: '$items' },
      { $match: { 'items.vendor': vendorId } },
      { $count: 'total' },
    ]),

    Order.aggregate([
      { $match: { 'items.vendor': vendorId, isPaid: true } },
      { $unwind: '$items' },
      { $match: { 'items.vendor': vendorId } },
      {
        $group: {
          _id: null,
          lifetimeEarnings: { $sum: '$items.vendorEarnings' },
          thisMonthEarnings: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$createdAt',
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  ],
                },
                '$items.vendorEarnings',
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    earnings: earningsData,
    summary: summary[0] || { lifetimeEarnings: 0, thisMonthEarnings: 0 },
    pagination: {
      page,
      limit,
      total: total[0]?.total || 0,
      pages: Math.ceil((total[0]?.total || 0) / limit),
    },
  });
});

// ─── GET /api/vendor/public/:vendorId ─────────────────────────────────────────
// Public — customer views a vendor's storefront
export const getPublicVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await User.findOne({
    _id: req.params.vendorId,
    role: 'vendor',
    'vendorInfo.applicationStatus': 'approved',
  }).select('name avatar vendorInfo.shopName vendorInfo.shopDescription vendorInfo.shopLogo vendorInfo.shopBanner vendorInfo.rating vendorInfo.numReviews createdAt');

  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  const products = await Product.find({
    vendor: vendor._id,
    isPublished: true,
    isApproved: true,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('name images price rating numReviews slug stock');

  res.json({ success: true, vendor, products });
});
