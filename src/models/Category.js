const mongoose = require('mongoose');

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
  { timestamps: true }
);

// Sibling names must be unique, but the same name may exist under different parents
categorySchema.index({ parent: 1, name: 1 }, { unique: true });
categorySchema.index({ parent: 1, slug: 1 }, { unique: true });
categorySchema.index({ ancestors: 1 });

categorySchema.pre('validate', function () {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
});

categorySchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Category', categorySchema);
