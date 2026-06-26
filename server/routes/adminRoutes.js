import express from 'express';
import { body } from 'express-validator';
import {
  getDashboard,
  getUsers,
  getUserById,
  toggleUserActive,
  deleteUser,
  getPendingVendors,
  approveVendor,
  rejectVendor,
  getAllProducts,
  approveProduct,
  rejectProduct,
  deleteProduct,
  getCategories,
  getAllOrders,
  updateOrderStatus,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/toggle-active', toggleUserActive);
router.delete('/users/:id', deleteUser);

// ─── Vendor Applications ──────────────────────────────────────────────────────
router.get('/vendors/pending', getPendingVendors);
router.patch(
  '/vendors/:id/approve',
  [body('note').optional().isString()],
  validate,
  approveVendor
);
router.patch(
  '/vendors/:id/reject',
  [body('note').optional().isString()],
  validate,
  rejectVendor
);

// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/products', getAllProducts);
router.patch('/products/:id/approve', approveProduct);
router.patch('/products/:id/reject', rejectProduct);
router.delete('/products/:id', deleteProduct);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', getCategories);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', getAllOrders);
router.patch(
  '/orders/:id/status',
  [body('status').isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded'])],
  validate,
  updateOrderStatus
);

export default router;
