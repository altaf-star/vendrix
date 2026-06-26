import express from 'express';
import {
  getPaymentConfig,
  createPaymentIntent,
  handleWebhook,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/config', getPaymentConfig);
router.post('/create-intent', protect, createPaymentIntent);
router.post('/webhook', handleWebhook);

export default router;
