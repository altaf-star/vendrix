import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    // Vendor's payout for this item (price * quantity * vendorCommissionRate)
    vendorEarnings: { type: Number, default: 0 },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName:   { type: String, required: true },
    street:     { type: String, required: true },
    city:       { type: String, required: true },
    province:   { type: String, required: true },
    postalCode: { type: String, required: true },
    country:    { type: String, required: true, default: 'Pakistan' },
    phone:      { type: String, required: true },
  },
  { _id: false }
);

const trackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentResultSchema = new mongoose.Schema(
  {
    stripePaymentIntentId: { type: String },
    stripeChargeId: { type: String },
    status: { type: String },
    email: { type: String },
    paidAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Human-readable order number (e.g. VDX-20240101-0001)
    orderNumber: {
      type: String,
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },

    items: {
      type: [orderItemSchema],
      validate: [(arr) => arr.length > 0, 'Order must have at least one item'],
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    // Pricing breakdown
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Platform commission (percentage taken from vendor earnings)
    platformCommissionRate: { type: Number, default: 0.1 }, // 10%

    // Coupon / discount code applied
    couponCode: { type: String },

    // Order lifecycle
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },

    // Per-vendor fulfillment status (useful in multi-vendor orders)
    vendorStatuses: [
      {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'processing', 'shipped', 'delivered', 'cancelled'],
          default: 'pending',
        },
        trackingNumber: { type: String },
        carrier: { type: String },
        estimatedDelivery: { type: Date },
        shippedAt: { type: Date },
        deliveredAt: { type: Date },
      },
    ],

    // Tracking history
    trackingHistory: [trackingEventSchema],

    // Payment
    paymentMethod: {
      type: String,
      enum: ['card', 'wallet', 'cod'],
      default: 'card',
    },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    paymentResult: paymentResultSchema,

    // Delivery
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },

    // Cancellation / refund details
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    refundAmount: { type: Number, default: 0 },
    refundedAt: { type: Date },
    stripeRefundId: { type: String },

    // Customer notes
    customerNote: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.vendor': 1, status: 1 });
orderSchema.index({ 'paymentResult.stripePaymentIntentId': 1 });

// ─── Pre-save: generate order number ─────────────────────────────────────────
orderSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's orders for sequential numbering
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const count = await mongoose.model('Order').countDocuments({
    createdAt: { $gte: startOfDay },
  });

  this.orderNumber = `VDX-${datePart}-${String(count + 1).padStart(4, '0')}`;
  next();
});

// ─── Virtual: total items count ──────────────────────────────────────────────
orderSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ─── Method: add tracking event ──────────────────────────────────────────────
orderSchema.methods.addTrackingEvent = function (status, description, location = '') {
  this.trackingHistory.push({ status, description, location });
  this.status = status;
};

const Order = mongoose.model('Order', orderSchema);
export default Order;
