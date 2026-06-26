import asyncHandler from 'express-async-handler';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

// ─── Protect: verify JWT and attach user to req ───────────────────────────────
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized — no token');
  }

  const decoded = verifyAccessToken(token); // throws on invalid/expired

  const user = await User.findById(decoded.id).select('-password -refreshToken');
  if (!user) {
    res.status(401);
    throw new Error('Not authorized — user not found');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Account has been deactivated');
  }

  req.user = user;
  next();
});

// ─── Role Guard: restrict to specific roles ───────────────────────────────────
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not authorized for this action`);
    }
    next();
  };
};

// ─── Vendor Guard: approved vendor only ──────────────────────────────────────
export const vendorApproved = (req, res, next) => {
  if (
    req.user.role !== 'vendor' ||
    req.user.vendorInfo?.applicationStatus !== 'approved'
  ) {
    res.status(403);
    throw new Error('Only approved vendors can perform this action');
  }
  next();
};

// ─── Optional Auth: attach user if token present, continue either way ─────────
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid token — silently continue as unauthenticated
  }
  next();
});
