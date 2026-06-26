import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Product image storage ────────────────────────────────────────────────────
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vendrix/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
  },
});

// ─── Avatar storage ───────────────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vendrix/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});

// ─── Shop banner / logo storage ───────────────────────────────────────────────
const shopStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'vendrix/shops',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:
      file.fieldname === 'shopBanner'
        ? [{ width: 1500, height: 500, crop: 'fill', quality: 'auto' }]
        : [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
  }),
});

const fileSizeLimit = 5 * 1024 * 1024; // 5 MB

export const uploadProductImages = multer({
  storage: productStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
}).array('images', 8); // max 8 images per product

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
}).single('avatar');

export const uploadShopAssets = multer({
  storage: shopStorage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
}).fields([
  { name: 'shopLogo', maxCount: 1 },
  { name: 'shopBanner', maxCount: 1 },
]);

// Helper to delete a Cloudinary asset by public_id
export const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
