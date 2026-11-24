// Business logic for categories.
//
// How nesting works: every category stores its `parent` and an `ancestors` list
// (the ids of all categories above it, root first). Example for Phones inside Electronics:
//   Electronics: parent null,        ancestors []
//   Phones:      parent Electronics, ancestors [Electronics]
// With that list, "everything under X" is one query: { ancestors: X }.
import Category from '../../database/models/categoryModel.js';
import Product from '../../database/models/productModel.js';
import AppError from '../../utils/appError.js';
import { slugify } from '../../utils/slug.js';

/* ---------- small helpers ---------- */

class CategoryService {
  static isSameId(a, b) {
    return String(a) === String(b);
  }

  static compareByName(a, b) {
    return a.name.localeCompare(b.name);
  }

  static async findCategoryOrFail(id, label = 'Category') {
    const category = await Category.findById(id);
    if (!category) throw AppError.notFound(`${label} not found`);
    return category;
  }

  // The unique index {parent, name} enforces "no two siblings share a name".
  // Here we only turn its raw error into a clear message.
  static explainDuplicate(err) {
    if (err.code === 11000) {
      return AppError.conflict('A category with the same name already exists under the same parent');
    }
    return err;
  }

  static async saveCategory(category) {
    try {
      await category.save();
    } catch (err) {
      throw CategoryService.explainDuplicate(err);
    }
  }

  /* ---------- tree helpers (no database access) ---------- */
  // Turns the flat list into nested { ..., children: [] } objects.
  // Each node is linked to its parent through a lookup map, so it works for any depth.
  static buildTree(categories) {
    const nodesById = new Map();
    categories.forEach(function (category) {
      const plain = typeof category.toObject === 'function' ? category.toObject() : { ...category };
      const { __v: ignoredVersion, ...fields } = plain; // old rows may still carry __v
      nodesById.set(String(fields._id), { ...fields, children: [] });
    });

    const roots = [];
    nodesById.forEach(function (node) {
      const parentNode = node.parent ? nodesById.get(String(node.parent)) : null;
      if (parentNode) parentNode.children.push(node);
      else roots.push(node);
    });

    nodesById.forEach(function (node) { return node.children.sort(CategoryService.compareByName); });
    return roots.sort(CategoryService.compareByName);
  }

  // Removes inactive categories together with everything below them.
  static removeInactiveNodes(nodes) {
    return nodes
      .filter(function (node) { return node.isActive; })
      .map(function (node) { return { ...node, children: CategoryService.removeInactiveNodes(node.children) }; });
  }

  /* ---------- moving a category ---------- */
  // Everything below the moved category now has a new path above it. Keep the part from the
  // moved category downwards, and replace the part above it.
  static async updateDescendantAncestors(movedId, newAncestors) {
    const descendants = await Category.find({ ancestors: movedId }).select('ancestors');
    if (descendants.length === 0) return;

    const updates = descendants.map(function (descendant) {
      const position = descendant.ancestors.findIndex(function (ancestorId) { return CategoryService.isSameId(ancestorId, movedId); });
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

  // Saves the category under a new parent (or at the top level when newParentId is empty).
  static async moveUnderParent(category, newParentId) {
    let newAncestors = [];

    if (newParentId) {
      if (CategoryService.isSameId(newParentId, category._id)) {
        throw AppError.badRequest('A category cannot be its own parent');
      }

      const newParent = await CategoryService.findCategoryOrFail(newParentId, 'Parent category');

      // If the new parent is somewhere below the moved category, the move would create a loop.
      const wouldCreateLoop = newParent.ancestors.some(function (ancestorId) { return CategoryService.isSameId(ancestorId, category._id); });
      if (wouldCreateLoop) {
        throw AppError.badRequest('A category cannot be moved under one of its own descendants');
      }

      newAncestors = [...newParent.ancestors, newParent._id];
    }

    category.parent = newParentId || null;
    category.ancestors = newAncestors;
    await CategoryService.saveCategory(category);

    await CategoryService.updateDescendantAncestors(category._id, newAncestors);
  }

  /* ---------- reading ---------- */
  // The full nested tree. Only one database query, no matter how deep it is.
  static async getCategoryTree({ includeInactive = false } = {}) {
    const categories = await Category.find().lean();
    const tree = CategoryService.buildTree(categories);
    return includeInactive ? tree : CategoryService.removeInactiveNodes(tree);
  }

  // Flat list, optionally only the children of one parent (?parent=<id> or ?parent=null for top level).
  static async listCategories({ parent } = {}) {
    const filter = {};
    if (parent === 'null') filter.parent = null;
    else if (parent) filter.parent = parent;
    return Category.find(filter).sort({ name: 1 });
  }

  static getCategoryById(id) {
    return CategoryService.findCategoryOrFail(id);
  }

  // The category's own id plus the ids of every category below it (used by the product filter).
  static async getSubtreeIds(id) {
    const descendantIds = await Category.find({ ancestors: id }).distinct('_id');
    return [id, ...descendantIds];
  }

  /* ---------- writing ---------- */
  static async createCategory({ name, description, parent, isActive }) {
    let ancestors = [];
    if (parent) {
      const parentCategory = await CategoryService.findCategoryOrFail(parent, 'Parent category');
      ancestors = [...parentCategory.ancestors, parentCategory._id];
    }

    try {
      return await Category.create({
        name,
        slug: slugify(name),
        description,
        isActive,
        parent: parent || null,
        ancestors,
      });
    } catch (err) {
      throw CategoryService.explainDuplicate(err);
    }
  }

  static async updateCategory(id, { name, description, parent, isActive }) {
    const category = await CategoryService.findCategoryOrFail(id);

    if (name !== undefined) {
      category.name = name;
      category.slug = slugify(name);
    }
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    const isMoving = parent !== undefined && !CategoryService.isSameId(parent || '', category.parent || '');
    if (isMoving) {
      await CategoryService.moveUnderParent(category, parent);
    } else {
      await CategoryService.saveCategory(category);
    }
    return category;
  }

  static async removeCategory(id) {
    const category = await CategoryService.findCategoryOrFail(id);

    const hasChildren = await Category.exists({ parent: id });
    if (hasChildren) throw AppError.conflict('Category has sub-categories. Move or delete them first');

    const hasProducts = await Product.exists({ category: id });
    if (hasProducts) throw AppError.conflict('Category still has products. Move or delete them first');

    await category.deleteOne();
  }

}

export default CategoryService;
