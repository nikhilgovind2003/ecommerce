// Business logic for categories.
//
// How nesting works: every category stores its `parent` and an `ancestors` list
// (the ids of all categories above it, root first). Example for Phones inside Electronics:
//   Electronics: parent null,        ancestors []
//   Phones:      parent Electronics, ancestors [Electronics]
// With that list, "everything under X" is one query: { ancestors: X }.
import Category from './category.model.js';
import Product from '../products/product.model.js';
import AppError from '../../shared/utils/AppError.js';

const sameId = (a, b) => String(a) === String(b);
const byName = (a, b) => a.name.localeCompare(b.name);

class CategoryService {
  /* ---------- reading ---------- */

  // The full nested tree. Only one database query, no matter how deep it is.
  async getTree({ includeInactive = false } = {}) {
    const categories = await Category.find().lean();
    const tree = this.buildTree(categories);
    return includeInactive ? tree : this.removeInactive(tree);
  }

  // Flat list, optionally only the children of one parent (?parent=<id> or ?parent=null for top level).
  async list({ parent } = {}) {
    const filter = {};
    if (parent === 'null') filter.parent = null;
    else if (parent) filter.parent = parent;
    return Category.find(filter).sort({ name: 1 });
  }

  getById(id) {
    return this.findOrFail(id);
  }

  // The category's own id plus the ids of every category below it (used by the product filter).
  async getSubtreeIds(id) {
    const descendantIds = await Category.find({ ancestors: id }).distinct('_id');
    return [id, ...descendantIds];
  }

  /* ---------- writing ---------- */

  async create({ name, description, parent, isActive }) {
    let ancestors = [];
    if (parent) {
      const parentCategory = await this.findOrFail(parent, 'Parent category');
      ancestors = [...parentCategory.ancestors, parentCategory._id];
    }

    try {
      return await Category.create({ name, description, isActive, parent: parent || null, ancestors });
    } catch (err) {
      throw this.explainDuplicate(err);
    }
  }

  async update(id, { name, description, parent, isActive }) {
    const category = await this.findOrFail(id);

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    const isMoving = parent !== undefined && !sameId(parent || '', category.parent || '');
    if (isMoving) {
      await this.moveUnderParent(category, parent);
    } else {
      await this.save(category);
    }
    return category;
  }

  async remove(id) {
    const category = await this.findOrFail(id);

    const hasChildren = await Category.exists({ parent: id });
    if (hasChildren) throw AppError.conflict('Category has sub-categories. Move or delete them first');

    const hasProducts = await Product.exists({ category: id });
    if (hasProducts) throw AppError.conflict('Category still has products. Move or delete them first');

    await category.deleteOne();
  }

  /* ---------- moving a category ---------- */

  // Saves the category under a new parent (or at the top level when newParentId is empty).
  async moveUnderParent(category, newParentId) {
    let newAncestors = [];

    if (newParentId) {
      if (sameId(newParentId, category._id)) {
        throw AppError.badRequest('A category cannot be its own parent');
      }

      const newParent = await this.findOrFail(newParentId, 'Parent category');

      // If the new parent is somewhere below this category, the move would create a loop.
      const wouldCreateLoop = newParent.ancestors.some((ancestorId) => sameId(ancestorId, category._id));
      if (wouldCreateLoop) {
        throw AppError.badRequest('A category cannot be moved under one of its own descendants');
      }

      newAncestors = [...newParent.ancestors, newParent._id];
    }

    category.parent = newParentId || null;
    category.ancestors = newAncestors;
    await this.save(category);

    await this.updateDescendantAncestors(category._id, newAncestors);
  }

  // Everything below the moved category now has a new path above it. Keep the part from the
  // moved category downwards, and replace the part above it.
  async updateDescendantAncestors(movedId, newAncestors) {
    const descendants = await Category.find({ ancestors: movedId }).select('ancestors');
    if (descendants.length === 0) return;

    const updates = descendants.map((descendant) => {
      const position = descendant.ancestors.findIndex((a) => sameId(a, movedId));
      const fromMovedDown = descendant.ancestors.slice(position);
      return {
        updateOne: {
          filter: { _id: descendant._id },
          update: { $set: { ancestors: [...newAncestors, ...fromMovedDown] } },
        },
      };
    });
    await Category.bulkWrite(updates);
  }

  /* ---------- tree helpers (no database access) ---------- */

  // Turns the flat list into nested { ..., children: [] } objects.
  // Each node is linked to its parent through a lookup map, so this works for any depth.
  buildTree(categories) {
    const nodesById = new Map();
    categories.forEach((category) => {
      const plain = typeof category.toObject === 'function' ? category.toObject() : { ...category };
      nodesById.set(String(plain._id), { ...plain, children: [] });
    });

    const roots = [];
    nodesById.forEach((node) => {
      const parentNode = node.parent ? nodesById.get(String(node.parent)) : null;
      if (parentNode) parentNode.children.push(node);
      else roots.push(node);
    });

    nodesById.forEach((node) => node.children.sort(byName));
    return roots.sort(byName);
  }

  // Removes inactive categories together with everything below them.
  removeInactive(nodes) {
    return nodes
      .filter((node) => node.isActive)
      .map((node) => ({ ...node, children: this.removeInactive(node.children) }));
  }

  /* ---------- small helpers ---------- */

  async findOrFail(id, label = 'Category') {
    const category = await Category.findById(id);
    if (!category) throw AppError.notFound(`${label} not found`);
    return category;
  }

  async save(category) {
    try {
      await category.save();
    } catch (err) {
      throw this.explainDuplicate(err);
    }
  }

  // The unique index {parent, name} enforces "no two siblings share a name".
  // Here we only turn its raw error into a clear message.
  explainDuplicate(err) {
    if (err.code === 11000) {
      return AppError.conflict('A category with this name already exists under the same parent');
    }
    return err;
  }
}

export default new CategoryService();
