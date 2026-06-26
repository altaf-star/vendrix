import express from 'express';
import { body } from 'express-validator';
import {
  createOrder,
  getOrders,
  getOrderById,
  getVendorOrders,
  updateVendorStatus,
  cancelOrder,
  adminUpdateOrderStatus,
  getOrderStats,
} from '../controllers/orderController.js';
import { protect, authorize, vendorApproved } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const createOrderRules = [
  body('cartItems')
    .isArray({ min: 1 }).withMessage('Cart must have at least one item'),
  body('cartItems.*.product')
    .notEmpty().withMessage('Product ID is required for each cart item'),
  body('cartItems.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.street').notEmpty().withMessage('Street is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.province').notEmpty().withMessage('Province is required'),
  body('shippingAddress.postalCode').notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone is required'),
];

const vendorStatusRules = [
  body('status')
    .isIn(['accepted', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
];

const adminStatusRules = [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid status value'),
];

// ─── Customer Routes ──────────────────────────────────────────────────────────
router.post('/', protect, authorize('customer'), createOrderRules, validate, createOrder);
router.get('/', protect, getOrders);

// ─── Vendor Routes (must be before /:id wildcard) ────────────────────────────
router.get('/vendor/mine', protect, authorize('vendor'), vendorApproved, getVendorOrders);

// ─── Admin Routes (must be before /:id wildcard) ─────────────────────────────
router.get('/admin/stats', protect, authorize('admin'), getOrderStats);

router.get('/:id', protect, getOrderById);
router.patch('/:id/cancel', protect, authorize('customer', 'admin'), cancelOrder);
router.patch(
  '/:id/vendor-status',
  protect,
  authorize('vendor'),
  vendorApproved,
  vendorStatusRules,
  validate,
  updateVendorStatus
);

router.patch(
  '/:id/admin-status',
  protect,
  authorize('admin'),
  adminStatusRules,
  validate,
  adminUpdateOrderStatus
);

export default router;
