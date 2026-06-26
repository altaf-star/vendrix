import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { deleteCloudinaryImage } from '../config/cloudinary.js';

// ─── GET /api/users/profile ───────────────────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name images price slug rating');
  res.json({ success: true, user: user.toPublicJSON() });
});

// ─── PUT /api/users/profile ───────────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;

  // If a new avatar URL is provided and the user had a previous Cloudinary one, delete it
  if (avatar && avatar !== user.avatar) {
    if (user.avatar && user.avatar.includes('cloudinary')) {
      // Extract publicId from URL — format: .../vendrix/avatars/<publicId>
      const parts = user.avatar.split('/');
      const publicId = `vendrix/avatars/${parts[parts.length - 1].split('.')[0]}`;
      await deleteCloudinaryImage(publicId);
    }
    user.avatar = avatar;
  }

  const updated = await user.save();
  res.json({ success: true, user: updated.toPublicJSON() });
});

// ─── POST /api/users/addresses ────────────────────────────────────────────────
export const addAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zipCode, country, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  // Only one default address allowed
  if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  user.addresses.push({ street, city, state, zipCode, country: country || 'US', isDefault: !!isDefault });
  await user.save();

  res.status(201).json({ success: true, addresses: user.addresses });
});

// ─── PUT /api/users/addresses/:addressId ──────────────────────────────────────
export const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  const { street, city, state, zipCode, country, isDefault } = req.body;

  if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  if (street) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (zipCode) address.zipCode = zipCode;
  if (country) address.country = country;
  if (isDefault !== undefined) address.isDefault = isDefault;

  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// ─── DELETE /api/users/addresses/:addressId ───────────────────────────────────
export const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  address.deleteOne();
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// ─── POST /api/users/wishlist/:productId ──────────────────────────────────────
export const toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const productId = req.params.productId;

  const index = user.wishlist.indexOf(productId);
  let action;

  if (index === -1) {
    user.wishlist.push(productId);
    action = 'added';
  } else {
    user.wishlist.splice(index, 1);
    action = 'removed';
  }

  await user.save();
  res.json({ success: true, action, wishlist: user.wishlist });
});

// ─── GET /api/users/wishlist ──────────────────────────────────────────────────
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'wishlist',
    'name images price slug rating numReviews stock isPublished'
  );
  res.json({ success: true, wishlist: user.wishlist });
});
