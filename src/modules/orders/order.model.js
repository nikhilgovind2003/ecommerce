// Order schema. Items are a copy of the product at purchase time, so old orders never change.
import mongoose from 'mongoose';
// Order life cycle: pending -> confirmed -> processing -> shipped -> delivered (or cancelled).
export const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// Snapshot of the product at purchase time, so later edits or deletes never change history.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: STATUSES, default: 'pending' },
    shippingAddress: { type: addressSchema, required: true },
    statusHistory: [historySchema],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Order', orderSchema);
