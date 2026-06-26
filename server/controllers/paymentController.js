import asyncHandler from 'express-async-handler';

// Payment is Cash on Delivery — no payment gateway active.
// Wire up JazzCash / Easypaisa here when ready.

export const getPaymentConfig = asyncHandler(async (req, res) => {
  res.json({ success: true, method: 'cod' });
});

export const createPaymentIntent = asyncHandler(async (req, res) => {
  res.status(400).json({ success: false, message: 'Online payments not enabled. Use Cash on Delivery.' });
});

export const handleWebhook = asyncHandler(async (req, res) => {
  res.json({ received: true });
});
