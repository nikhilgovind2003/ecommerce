const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { buildTree, pruneInactive } = require('../utils/categoryTree');

// The unique {parent, name} index is what actually enforces this; we just word the error well.
const rethrowDuplicate = (err) => {
  if (err.code === 11000) throw AppError.conflict('A category with this name already exists under the same parent');
  throw err;
};

const findOrFail = async (id, label = 'Category') => {
  const category = await Category.findById(id);
  if (!category) throw AppError.notFound(`${label} not found`);
  return category;
};

// ids of the category itself plus every descendant, at any depth (one indexed query)
exports.getSubtreeIds = async (id) => {
  const descendants = await Category.find({ ancestors: id }).distinct('_id');
  return [id, ...descendants];
};

exports.getTree = async ({ includeInactive = false } = {}) => {
  const all = await Category.find().lean();
  const tree = buildTree(all);
  return includeInactive ? tree : pruneInactive(tree);
};

exports.list = async ({ parent } = {}) => {
  const filter = {};
  if (parent === 'null') filter.parent = null;
  else if (parent) filter.parent = parent;
  return Category.find(filter).sort({ name: 1 });
};

exports.getById = (id) => findOrFail(id);

exports.create = async ({ name, description, parent, isActive }) => {
  let ancestors = [];
  if (parent) {
    const parentDoc = await findOrFail(parent, 'Parent category');
    ancestors = [...parentDoc.ancestors, parentDoc._id];
  }
  return Category.create({ name, description, isActive, parent: parent || null, ancestors }).catch(rethrowDuplicate);
};

exports.update = async (id, { name, description, parent, isActive }) => {
  const category = await findOrFail(id);
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;

  const parentChanging = parent !== undefined && String(parent || '') !== String(category.parent || '');
  if (!parentChanging) {
    await category.save().catch(rethrowDuplicate);
    return category;
  }

  let newAncestors = [];
  if (parent) {
    if (String(parent) === String(id)) throw AppError.badRequest('A category cannot be its own parent');
    const newParent = await findOrFail(parent, 'Parent category');
    // If the new parent sits somewhere below this category, moving would create a loop
    if (newParent.ancestors.some((a) => String(a) === String(id))) {
      throw AppError.badRequest('A category cannot be moved under one of its own descendants');
    }
    newAncestors = [...newParent.ancestors, newParent._id];
  }

  category.parent = parent || null;
  category.ancestors = newAncestors;
  await category.save().catch(rethrowDuplicate);

  // Re-base the ancestor path of the whole subtree: keep the part from this node downwards
  const descendants = await Category.find({ ancestors: id }).select('ancestors');
  if (descendants.length) {
    await Category.bulkWrite(
      descendants.map((d) => {
        const idx = d.ancestors.findIndex((a) => String(a) === String(id));
        return {
          updateOne: {
            filter: { _id: d._id },
            update: { $set: { ancestors: [...newAncestors, ...d.ancestors.slice(idx)] } },
          },
        };
      })
    );
  }
  return category;
};

exports.remove = async (id) => {
  const category = await findOrFail(id);
  if (await Category.exists({ parent: id })) {
    throw AppError.conflict('Category has sub-categories. Move or delete them first');
  }
  if (await Product.exists({ category: id })) {
    throw AppError.conflict('Category still has products. Move or delete them first');
  }
  await category.deleteOne();
};
