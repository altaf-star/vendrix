import express from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  aiSearch,
  getReviewSummary,
  generateProductDescription,
  generateMetaTags,
  shopAssistantChat,
} from '../controllers/aiController.js';
import { protect, authorize, optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

// Stricter rate limit for AI endpoints — Claude API calls are expensive
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,
  message: { success: false, message: 'Too many AI requests — please slow down' },
});

router.use(aiLimiter);

// ─── Public / Optional Auth ───────────────────────────────────────────────────

// Natural language search — no auth required
router.post(
  '/search',
  optionalAuth,
  [body('query').trim().notEmpty().withMessage('Search query is required')],
  validate,
  aiSearch
);

// Review summary — no auth required, result is cached on product
router.get('/review-summary/:productId', getReviewSummary);

// Shopping assistant chat — no auth required
router.post(
  '/chat',
  optionalAuth,
  [body('messages').isArray({ min: 1 }).withMessage('messages must be a non-empty array')],
  validate,
  shopAssistantChat
);

// ─── Vendor-only AI tools ─────────────────────────────────────────────────────

router.post(
  '/generate-description',
  protect,
  authorize('vendor', 'admin'),
  [
    body('productName').trim().notEmpty().withMessage('Product name is required'),
    body('features').isArray({ min: 1 }).withMessage('features must be a non-empty array'),
    body('tone').optional().isString(),
  ],
  validate,
  generateProductDescription
);

router.post(
  '/generate-meta',
  protect,
  authorize('vendor', 'admin'),
  [
    body('productName').trim().notEmpty().withMessage('Product name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ],
  validate,
  generateMetaTags
);

export default router;
