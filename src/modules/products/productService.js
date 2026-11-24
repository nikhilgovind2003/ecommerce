// Business logic for products: admin CRUD and the customer listing (search, filters, sort, pages).
import Product from '../../database/models/productModel.js';
import Category from '../../database/models/categoryModel.js';
import CategoryService from '../categories/categoryService.js';
import AppError from '../../utils/appError.js';
import { parsePagination, buildPagination, searchRegex } from '../../utils/query.js';

// The ?sort= choices. `_id` is the last sort key so pages stay stable when many products tie.
const SORT_OPTIONS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { effectivePrice: 1, _id: 1 },
  price_desc: { effectivePrice: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: 1 },
};

/* ---------- helpers ---------- */

class ProductService {
  // The ?sort= values that are accepted.
  static SORT_KEYS = Object.keys(SORT_OPTIONS);

  // What the customer pays: the sale price when there is one, otherwise the normal price.
  static computeEffectivePrice(price, salePrice) {
    return salePrice != null ? salePrice : price;
  }

  static async ensureCategoryExists(categoryId) {
    const exists = await Category.exists({ _id: categoryId });
    if (!exists) throw AppError.badRequest('Category does not exist');
  }

  static ensureSalePriceIsValid(price, salePrice) {
    if (salePrice != null && salePrice > price) {
      throw AppError.badRequest('salePrice cannot be higher than price');
    }
  }

  // Turns the query string (?search=&category=&minPrice=&maxPrice=) into a MongoDB filter.
  static async buildProductFilter(query, adminView) {
    const filter = {};

    if (!adminView) filter.status = 'active';
    else if (query.status) filter.status = query.status;

    if (query.search) {
      const regex = searchRegex(query.search);
      filter.$or = [{ name: regex }, { sku: regex }, { description: regex }];
    }

    // A parent category also returns the products of all of its sub-categories.
    if (query.category) {
      filter.category = { $in: await CategoryService.getSubtreeIds(query.category) };
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

  /* ---------- reading ---------- */
  // One listing for both customers and admins.
  // Customers only ever see active products. Admins (adminView) see all and can filter by status.
  static async listProducts(query, { adminView = false } = {}) {
    const filter = await ProductService.buildProductFilter(query, adminView);
    const sort = SORT_OPTIONS[query.sort] || SORT_OPTIONS.newest;
    const page = parsePagination(query);

    const [products, total] = await Promise.all([
      Product.find(filter).populate('category', 'name slug').sort(sort).skip(page.skip).limit(page.limit),
      Product.countDocuments(filter),
    ]);
    return { products, pagination: buildPagination(page, total) };
  }

  static async getProductById(id, { adminView = false } = {}) {
    const product = await Product.findById(id).populate('category', 'name slug');
    if (!product) throw AppError.notFound('Product not found');

    // Customers get a plain "not found" for inactive products.
    if (!adminView && product.status !== 'active') throw AppError.notFound('Product not found');
    return product;
  }

  /* ---------- writing ---------- */
  static async createProduct(data) {
    await ProductService.ensureCategoryExists(data.category);
    ProductService.ensureSalePriceIsValid(data.price, data.salePrice);

    const product = await Product.create({
      ...data,
      effectivePrice: ProductService.computeEffectivePrice(data.price, data.salePrice),
    });
    return product.populate('category', 'name slug');
  }

  // Load, change, save (instead of findByIdAndUpdate) so validation always runs.
  // The sale price rule and effectivePrice are checked on the merged values, so partial updates work.
  static async updateProduct(id, data) {
    const product = await Product.findById(id);
    if (!product) throw AppError.notFound('Product not found');

    if (data.category) await ProductService.ensureCategoryExists(data.category);

    product.set(data);
    ProductService.ensureSalePriceIsValid(product.price, product.salePrice);
    product.effectivePrice = ProductService.computeEffectivePrice(product.price, product.salePrice);

    await product.save();
    return product.populate('category', 'name slug');
  }

  static async removeProduct(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw AppError.notFound('Product not found');
  }

}

export default ProductService;
