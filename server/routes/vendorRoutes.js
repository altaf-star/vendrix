import express from 'express';
import { body } from 'express-validator';
import {
  getDashboard,
  getVendorProfile,
  updateVendorProfile,
  getEarnings,
  getPublicVendorProfile,
} from '../controllers/vendorController.js';
import { protect, authorize, vendorApproved } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

const updateProfileRules = [
  body('shopName').optional().trim().notEmpty().withMessage('Shop name cannot be empty'),
  body('businessEmail').optional().isEmail().withMessage('Valid business email required'),
];

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/public/:vendorId', getPublicVendorProfile);

// ─── Authenticated vendor ─────────────────────────────────────────────────────
router.use(protect, authorize('vendor'));

router.get('/dashboard', vendorApproved, getDashboard);
router.get('/profile', getVendorProfile);
router.put('/profile', updateProfileRules, validate, updateVendorProfile);
router.get('/earnings', vendorApproved, getEarnings);

export default router;
