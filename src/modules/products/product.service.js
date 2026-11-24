// Business logic for products: admin CRUD and the customer listing (search, filters, sort, pages).
import Product from './product.model.js';
import Category from '../categories/category.model.js';
import categoryService from '../categories/category.service.js';
import AppError from '../../shared/utils/AppError.js';
import { parsePagination, buildPagination, searchRegex } from '../../shared/utils/query.js';

// The ?sort= choices. `_id` is the last sort key so pages stay stable when many products tie.
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { effectivePrice: 1, _id: 1 },
  price_desc: { effectivePrice: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: 1 },
};

export const SORT_KEYS = Object.keys(SORTS);

class ProductService {
  // One listing for both customers and admins.
  // Customers only ever see active products. Admins (adminView) see all and can filter by status.
  async list(query, { adminView = false } = {}) {
    const filter = await this.buildFilter(query, adminView);
    const sort = SORTS[query.sort] || SORTS.newest;
    const page = parsePagination(query);

    const [products, total] = await Promise.all([
      Product.find(filter).populate('category', 'name slug').sort(sort).skip(page.skip).limit(page.limit),
      Product.countDocuments(filter),
    ]);
    return { products, pagination: buildPagination(page, total) };
  }

  async getById(id, { adminView = false } = {}) {
    const product = await Product.findById(id).populate('category', 'name slug');
    if (!product) throw AppError.notFound('Product not found');

    // Customers get a plain "not found" for inactive products.
    if (!adminView && product.status !== 'active') throw AppError.notFound('Product not found');
    return product;
  }

  async create(data) {
    await this.ensureCategoryExists(data.category);
    const product = await Product.create(data);
    return product.populate('category', 'name slug');
  }

  // Load, change, save (instead of findByIdAndUpdate) so validation and the effectivePrice hook always run.
  async update(id, data) {
    const product = await Product.findById(id);
    if (!product) throw AppError.notFound('Product not found');

    if (data.category) await this.ensureCategoryExists(data.category);

    product.set(data);
    await product.save();
    return product.populate('category', 'name slug');
  }

  async remove(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw AppError.notFound('Product not found');
  }

  /* ---------- helpers ---------- */

  // Turns the query string (?search=&category=&minPrice=&maxPrice=) into a MongoDB filter.
  async buildFilter(query, adminView) {
    const filter = {};

    if (!adminView) filter.status = 'active';
    else if (query.status) filter.status = query.status;

    if (query.search) {
      const regex = searchRegex(query.search);
      filter.$or = [{ name: regex }, { sku: regex }, { description: regex }];
    }

    // A parent category also returns the products of all of its sub-categories.
    if (query.category) {
      filter.category = { $in: await categoryService.getSubtreeIds(query.category) };
    }

    // Prices are compared on effectivePrice: the sale price when there is one, otherwise the normal price.
    const hasMin = query.minPrice !== undefined;
    const hasMax = query.maxPrice !== undefined;
    if (hasMin || hasMax) {
      filter.effectivePrice = {};
      if (hasMin) filter.effectivePrice.$gte = Number(query.minPrice);
      if (hasMax) filter.effectivePrice.$lte = Number(query.maxPrice);
    }

    return filter;
  }

  async ensureCategoryExists(categoryId) {
    const exists = await Category.exists({ _id: categoryId });
    if (!exists) throw AppError.badRequest('Category does not exist');
  }
}

export default new ProductService();
