import express from 'express';
import { body, param } from 'express-validator';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  resendVerificationByEmail,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

// ─── Validation rule sets ─────────────────────────────────────────────────────

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  body('role')
    .optional()
    .isIn(['customer', 'vendor']).withMessage('Role must be customer or vendor'),
  body('shopName')
    .if(body('role').equals('vendor'))
    .notEmpty().withMessage('Shop name is required for vendors'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Must contain at least one number'),
];

const forgotPasswordRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const resetPasswordRules = [
  param('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Must contain at least one number'),
];

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password/:token', resetPasswordRules, validate, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', protect, resendVerification);
router.post('/resend-verification-by-email', resendVerificationByEmail);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePasswordRules, validate, changePassword);

export default router;
