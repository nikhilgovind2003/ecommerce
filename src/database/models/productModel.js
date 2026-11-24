// Product schema. `effectivePrice` is the sale price if there is one, otherwise the normal price.
// The service keeps it in sync and checks that salePrice is not above price.
import mongoose from 'mongoose';

export const PRODUCT_STATUSES = ['active', 'inactive'];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    price: { type: Number, required: true, min: 0 },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    // What the customer actually pays. Stored (not virtual) so price filters and sorting can use an index.
    effectivePrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'active' },
  },
  { timestamps: true, versionKey: false }
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ status: 1, effectivePrice: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);