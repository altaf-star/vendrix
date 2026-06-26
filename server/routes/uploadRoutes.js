import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, authorize, vendorApproved } from '../middleware/authMiddleware.js';
import {
  uploadProductImages,
  uploadAvatar,
  uploadShopAssets,
  deleteCloudinaryImage,
} from '../config/cloudinary.js';

const router = express.Router();

// Wrap multer callbacks in a promise so async errors surface to errorHandler
const runMulter = (multerFn) => (req, res, next) => {
  multerFn(req, res, (err) => {
    if (err) {
      res.status(400);
      return next(new Error(err.message));
    }
    next();
  });
};

// POST /api/upload/products  — vendor uploads product images
router.post(
  '/products',
  protect,
  authorize('vendor', 'admin'),
  runMulter(uploadProductImages),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      res.status(400);
      throw new Error('No images uploaded');
    }
    const images = req.files.map((f) => ({
      url: f.path,
      publicId: f.filename,
      alt: f.originalname,
    }));
    res.json({ success: true, images });
  })
);

// POST /api/upload/avatar  — any authenticated user updates avatar
router.post(
  '/avatar',
  protect,
  runMulter(uploadAvatar),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error('No image uploaded');
    }
    res.json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  })
);

// POST /api/upload/shop  — vendor uploads shop logo/banner
router.post(
  '/shop',
  protect,
  authorize('vendor'),
  runMulter(uploadShopAssets),
  asyncHandler(async (req, res) => {
    const result = {};
    if (req.files?.shopLogo?.[0]) {
      result.shopLogo = {
        url: req.files.shopLogo[0].path,
        publicId: req.files.shopLogo[0].filename,
      };
    }
    if (req.files?.shopBanner?.[0]) {
      result.shopBanner = {
        url: req.files.shopBanner[0].path,
        publicId: req.files.shopBanner[0].filename,
      };
    }
    if (Object.keys(result).length === 0) {
      res.status(400);
      throw new Error('No files uploaded');
    }
    res.json({ success: true, ...result });
  })
);

// DELETE /api/upload  — delete a Cloudinary asset by publicId
router.delete(
  '/',
  protect,
  authorize('vendor', 'admin'),
  asyncHandler(async (req, res) => {
    const { publicId } = req.body;
    if (!publicId) {
      res.status(400);
      throw new Error('publicId is required');
    }
    await deleteCloudinaryImage(publicId);
    res.json({ success: true, message: 'Image deleted' });
  })
);

export default router;
