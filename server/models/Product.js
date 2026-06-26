import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, maxlength: 100 },
    comment: { type: String, required: true, maxlength: 2000 },
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const specificationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor is required'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    shortDescription: {
      type: String,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Electronics',
        'Clothing',
        'Home & Garden',
        'Sports & Outdoors',
        'Health & Beauty',
        'Toys & Games',
        'Books',
        'Automotive',
        'Food & Grocery',
        'Jewelry',
        'Art & Crafts',
        'Pet Supplies',
        'Office Supplies',
        'Other',
      ],
    },
    subcategory: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],

    // Pricing
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare-at price cannot be negative'],
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative'],
      select: false, // only vendor/admin see this
    },

    // Inventory
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    sku: { type: String, trim: true },
    brand: { type: String, trim: true },
    weight: { type: Number, min: 0 }, // in grams
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },

    // Media
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String }, // Cloudinary public_id for deletion
        alt: { type: String },
      },
    ],

    // Specs (key-value pairs like "Color: Red", "Material: Cotton")
    specifications: [specificationSchema],

    // Reviews & Ratings
    reviews: [reviewSchema],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },

    // AI-generated review summary (cached, regenerated when reviews change)
    reviewSummary: {
      text: { type: String },
      generatedAt: { type: Date },
    },

    // Status
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true }, // admin can un-approve

    // Shipping
    shippingClass: {
      type: String,
      enum: ['free', 'standard', 'express', 'heavy'],
      default: 'standard',
    },
    shippingCost: { type: Number, default: 0 },

    // SEO
    metaTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, maxlength: 160 },

    // Stats
    totalSold: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ vendor: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isPublished: 1, isApproved: 1 });

// ─── Virtual: discount percentage ────────────────────────────────────────────
productSchema.virtual('discountPercentage').get(function () {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

// ─── Virtual: in stock flag ───────────────────────────────────────────────────
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// ─── Pre-save: auto-generate slug ────────────────────────────────────────────
productSchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();

  let baseSlug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // Ensure slug uniqueness
  let slug = baseSlug;
  let count = 1;
  while (await mongoose.model('Product').findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${count++}`;
  }
  this.slug = slug;
  next();
});

// ─── Method: recalculate rating after review changes ─────────────────────────
productSchema.methods.updateRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
    return;
  }
  const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
  this.rating = Math.round((total / this.reviews.length) * 10) / 10;
  this.numReviews = this.reviews.length;
};

const Product = mongoose.model('Product', productSchema);
export default Product;
