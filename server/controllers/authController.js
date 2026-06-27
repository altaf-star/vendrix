import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Persist hashed refresh token (store hash, not plaintext)
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: user.toPublicJSON(),
  });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Prevent self-assigning admin role
  const allowedRoles = ['customer', 'vendor'];
  const assignedRole = allowedRoles.includes(role) ? role : 'customer';

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const userData = { name, email, password, role: assignedRole };

  // Vendor applicants need shop info
  if (assignedRole === 'vendor') {
    const { shopName, shopDescription, businessEmail, businessPhone } = req.body;
    if (!shopName) {
      res.status(400);
      throw new Error('Shop name is required for vendor registration');
    }
    userData.vendorInfo = {
      shopName,
      shopDescription,
      businessEmail: businessEmail || email,
      businessPhone,
      applicationStatus: 'pending',
    };
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  userData.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  userData.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  const user = await User.create(userData);

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  let emailError = null;
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
  } catch (err) {
    emailError = err.message;
    logger.error(`Verification email failed: ${err.message}`);
  }

  logger.info(`New ${assignedRole} registered: ${email}`);

  if (emailError) logger.error(`Verification email failed for ${email}: ${emailError}`);

  // Vendors are logged in immediately (need access to /vendor/pending)
  // Customers must verify email first before logging in
  if (assignedRole === 'vendor') {
    await sendTokenResponse(user, 201, res);
  } else {
    res.status(201).json({ success: true, message: 'Account created — check your email to verify' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Account deactivated — contact support');
  }

  logger.info(`User logged in: ${email}`);
  await sendTokenResponse(user, 200, res);
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
// Issues a new access token + rotates the refresh token
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.vendrix_refresh;
  if (!token) {
    res.status(401);
    throw new Error('No refresh token');
  }

  const decoded = verifyRefreshToken(token); // throws if invalid/expired

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    _id: decoded.id,
    refreshToken: hashedToken,
  }).select('+refreshToken');

  if (!user) {
    // Token reuse detected — invalidate all sessions for this user
    clearRefreshCookie(res);
    res.status(401);
    throw new Error('Refresh token reuse detected — please log in again');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Account deactivated');
  }

  logger.info(`Token refreshed for user: ${user.email}`);
  await sendTokenResponse(user, 200, res);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.vendrix_refresh;

  if (token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    // Clear stored refresh token in DB
    await User.findOneAndUpdate(
      { refreshToken: hashedToken },
      { $unset: { refreshToken: '' } }
    );
  }

  clearRefreshCookie(res);

  res.json({ success: true, message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  // req.user is already populated by protect middleware
  const user = await User.findById(req.user._id).populate('wishlist', 'name images price slug');

  res.json({ success: true, user: user.toPublicJSON() });
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  // Clear all existing sessions on password change
  user.refreshToken = undefined;
  await user.save();

  clearRefreshCookie(res);

  res.json({ success: true, message: 'Password changed — please log in again' });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always respond 200 to prevent email enumeration
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
  } catch (err) {
    // Don't expose email errors to client — just log and continue
    logger.error(`Failed to send reset email to ${email}: ${err.message}`);
  }
  logger.info(`Password reset token generated for: ${email}`);

  res.json({
    success: true,
    message: 'If an account exists, a reset link has been sent',
    // Only expose token in development for testing
    ...(process.env.NODE_ENV === 'development' && { resetToken }),
  });
});

// ─── GET /api/auth/verify-email/:token ───────────────────────────────────────
export const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({ emailVerificationToken: hashedToken })
    .select('+emailVerificationToken +emailVerificationExpire');

  if (!user) {
    res.status(400);
    throw new Error('Verification link is invalid or already used');
  }

  if (user.emailVerificationExpire && user.emailVerificationExpire < Date.now()) {
    res.status(400);
    throw new Error('Verification link has expired — please request a new one');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email verified successfully' });
});

// ─── POST /api/auth/resend-verification ──────────────────────────────────────
// Protected — for logged-in users who haven't verified yet
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+emailVerificationToken +emailVerificationExpire');

  if (user.isEmailVerified) {
    res.status(400);
    throw new Error('Email is already verified');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });

  res.json({ success: true, message: 'Verification email resent' });
});

// ─── POST /api/auth/resend-verification-by-email ─────────────────────────────
// Public — for users blocked at login who need a new verification email
export const resendVerificationByEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always respond 200 to prevent email enumeration
  const user = await User.findOne({ email });
  if (!user || user.isEmailVerified) {
    return res.json({ success: true, message: 'If this email exists and is unverified, a link has been sent' });
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });

  res.json({ success: true, message: 'Verification email sent' });
});

// ─── POST /api/auth/reset-password/:token ────────────────────────────────────
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Reset token is invalid or has expired');
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  user.refreshToken = undefined; // invalidate all sessions
  await user.save();

  clearRefreshCookie(res);

  res.json({ success: true, message: 'Password reset successful — please log in' });
});
