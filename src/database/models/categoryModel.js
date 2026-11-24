// Category schema. `parent` is the direct parent, `ancestors` lists every category above it.
// The slug is set by the service from the name.
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    // Direct parent (null for a root category)
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    // Every ancestor from the root down to the parent, e.g. [Electronics, Mobiles].
    // Lets us fetch a whole subtree with one indexed query and detect cycles cheaply.
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

// Sibling names must be unique, but the same name may exist under different parents
categorySchema.index({ parent: 1, name: 1 }, { unique: true });
categorySchema.index({ parent: 1, slug: 1 }, { unique: true });
categorySchema.index({ ancestors: 1 });

export default mongoose.model('Category', categorySchema);
