import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorProducts,
  addReview,
  deleteReview,
  markReviewHelpful,
} from '../controllers/productController.js';
import { protect, authorize, vendorApproved, optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

// ─── Validation rule sets ─────────────────────────────────────────────────────

const createProductRules = [
  body('name').trim().notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  body('description').trim().notEmpty().withMessage('Description is required')
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
  body('category').notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('compareAtPrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be positive'),
];

const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().notEmpty().withMessage('Review title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('comment').trim().notEmpty().withMessage('Review comment is required')
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters'),
];

// ─── Public Routes ────────────────────────────────────────────────────────────
router.get('/', optionalAuth, getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/id/:id', optionalAuth, getProductById);

// ─── Vendor Routes (must be before /:slug wildcard) ──────────────────────────
router.get('/vendor/mine', protect, authorize('vendor', 'admin'), getVendorProducts);

router.get('/:slug', optionalAuth, getProductBySlug);

router.post(
  '/',
  protect,
  authorize('vendor', 'admin'),
  vendorApproved,
  createProductRules,
  validate,
  createProduct
);

router.put(
  '/:id',
  protect,
  authorize('vendor', 'admin'),
  updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('vendor', 'admin'),
  deleteProduct
);

// ─── Review Routes ────────────────────────────────────────────────────────────
router.post(
  '/:id/reviews',
  protect,
  authorize('customer'),
  reviewRules,
  validate,
  addReview
);

router.delete(
  '/:id/reviews/:reviewId',
  protect,
  authorize('customer', 'admin'),
  deleteReview
);

router.put(
  '/:id/reviews/:reviewId/helpful',
  protect,
  markReviewHelpful
);

export default router;
