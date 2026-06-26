import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { deleteCloudinaryImage } from '../config/cloudinary.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildProductFilter = (query) => {
  const filter = { isPublished: true, isApproved: true };

  if (query.category) filter.category = query.category;
  if (query.vendor) filter.vendor = query.vendor;
  if (query.brand) filter.brand = new RegExp(query.brand, 'i');
  if (query.inStock === 'true') filter.stock = { $gt: 0 };

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.minRating) filter.rating = { $gte: Number(query.minRating) };

  if (query.tags) {
    const tags = query.tags.split(',').map((t) => t.trim().toLowerCase());
    filter.tags = { $in: tags };
  }

  return filter;
};

const buildSortOption = (sort) => {
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    rating: { rating: -1 },
    popular: { totalSold: -1 },
  };
  return sortMap[sort] || { createdAt: -1 };
};

// ─── GET /api/products ────────────────────────────────────────────────────────
// Public — browse with filters, search, pagination
export const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 12);
  const skip = (page - 1) * limit;

  const filter = buildProductFilter(req.query);
  const sort = buildSortOption(req.query.sort);

  // Keyword search (uses text index on name + description + tags)
  if (req.query.keyword) {
    filter.$text = { $search: req.query.keyword };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-reviews -reviewSummary -costPrice -specifications')
      .populate('vendor', 'name vendorInfo.shopName vendorInfo.shopLogo vendorInfo.rating'),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ─── GET /api/products/featured ───────────────────────────────────────────────
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isPublished: true,
    isApproved: true,
    isFeatured: true,
  })
    .sort({ rating: -1, totalSold: -1 })
    .limit(8)
    .select('-reviews -reviewSummary -costPrice')
    .populate('vendor', 'name vendorInfo.shopName vendorInfo.shopLogo');

  res.json({ success: true, products });
});

// ─── GET /api/products/categories ────────────────────────────────────────────
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $match: { isPublished: true, isApproved: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { category: '$_id', count: 1, _id: 0 } },
  ]);

  res.json({ success: true, categories });
});

// ─── GET /api/products/:slug ──────────────────────────────────────────────────
// Public — full product detail
export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isApproved: true })
    .populate('vendor', 'name vendorInfo.shopName vendorInfo.shopLogo vendorInfo.rating vendorInfo.numReviews')
    .populate('reviews.user', 'name avatar');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Increment view count (fire and forget)
  Product.findByIdAndUpdate(product._id, { $inc: { views: 1 } }).exec();

  res.json({ success: true, product });
});

// ─── GET /api/products/id/:id ─────────────────────────────────────────────────
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('vendor', 'name vendorInfo.shopName vendorInfo.shopLogo')
    .populate('reviews.user', 'name avatar');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json({ success: true, product });
});

// ─── POST /api/products ───────────────────────────────────────────────────────
// Vendor — create a new product
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name, description, shortDescription, category, subcategory,
    price, compareAtPrice, costPrice, stock, sku, brand,
    weight, dimensions, tags, specifications,
    shippingClass, shippingCost, metaTitle, metaDescription,
    isPublished, images,
  } = req.body;

  const product = await Product.create({
    vendor: req.user._id,
    name,
    description,
    shortDescription,
    category,
    subcategory,
    price,
    compareAtPrice,
    costPrice,
    stock,
    sku,
    brand,
    weight,
    dimensions,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
    specifications: specifications || [],
    shippingClass,
    shippingCost,
    metaTitle,
    metaDescription,
    isPublished: isPublished ?? false,
    images: images || [],
  });

  res.status(201).json({ success: true, product });
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
// Vendor — update own product; Admin — update any
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Vendors may only edit their own products
  if (req.user.role === 'vendor' && product.vendor.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to edit this product');
  }

  const allowedFields = [
    'name', 'description', 'shortDescription', 'category', 'subcategory',
    'price', 'compareAtPrice', 'costPrice', 'stock', 'sku', 'brand',
    'weight', 'dimensions', 'tags', 'specifications', 'images',
    'shippingClass', 'shippingCost', 'metaTitle', 'metaDescription',
    'isPublished', 'isFeatured',
  ];

  // Admin-only fields
  if (req.user.role === 'admin') {
    allowedFields.push('isApproved');
  }

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  const updated = await product.save();
  res.json({ success: true, product: updated });
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
// Vendor — delete own product; Admin — delete any
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (req.user.role === 'vendor' && product.vendor.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this product');
  }

  // Clean up Cloudinary images
  await Promise.all(
    product.images.map((img) => deleteCloudinaryImage(img.publicId))
  );

  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted' });
});

// ─── GET /api/products/vendor/mine ───────────────────────────────────────────
// Vendor — list their own products (all statuses)
export const getVendorProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const filter = { vendor: req.user._id };
  if (req.query.status === 'published') filter.isPublished = true;
  if (req.query.status === 'draft') filter.isPublished = false;
  if (req.query.category) filter.category = req.query.category;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-reviews -reviewSummary'),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ─── POST /api/products/:id/reviews ──────────────────────────────────────────
// Customer — add a review (must have purchased the product)
export const addReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Block duplicate reviews
  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );
  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  // Verify purchase (at least one delivered order containing this product)
  const hasPurchased = await Order.exists({
    customer: req.user._id,
    'items.product': product._id,
    status: 'delivered',
  });

  const review = {
    user: req.user._id,
    name: req.user.name,
    avatar: req.user.avatar,
    rating: Number(rating),
    title,
    comment,
    isVerifiedPurchase: !!hasPurchased,
  };

  product.reviews.push(review);
  product.updateRating();

  // Invalidate cached AI summary so it regenerates on next request
  product.reviewSummary = undefined;

  await product.save();

  res.status(201).json({
    success: true,
    message: 'Review added',
    rating: product.rating,
    numReviews: product.numReviews,
  });
});

// ─── DELETE /api/products/:id/reviews/:reviewId ───────────────────────────────
// Customer — delete own review; Admin — delete any
export const deleteReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const review = product.reviews.id(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (req.user.role !== 'admin' && review.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this review');
  }

  review.deleteOne();
  product.updateRating();
  product.reviewSummary = undefined;
  await product.save();

  res.json({ success: true, message: 'Review deleted' });
});

// ─── PUT /api/products/:id/reviews/:reviewId/helpful ─────────────────────────
// Any authenticated user — upvote a review as helpful
export const markReviewHelpful = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const review = product.reviews.id(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  review.helpfulVotes += 1;
  await product.save();

  res.json({ success: true, helpfulVotes: review.helpfulVotes });
});
