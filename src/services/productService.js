const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const categoryService = require('./categoryService');
const { parsePagination, buildPagination } = require('../utils/pagination');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `_id` is the tie-breaker so pages stay stable when many products share a price
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { effectivePrice: 1, _id: 1 },
  price_desc: { effectivePrice: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: 1 },
};

const ensureCategoryExists = async (id) => {
  if (!(await Category.exists({ _id: id }))) throw AppError.badRequest('Category does not exist');
};

const findOrFail = async (id) => {
  const product = await Product.findById(id).populate('category', 'name slug');
  if (!product) throw AppError.notFound('Product not found');
  return product;
};

/**
 * Shared by the customer and admin listings.
 * `adminView` lets the caller see inactive products and filter by status.
 */
exports.list = async (query, { adminView = false } = {}) => {
  const filter = {};
  if (adminView) {
    if (query.status) filter.status = query.status;
  } else {
    filter.status = 'active';
  }

  if (query.search) {
    const re = new RegExp(escapeRegex(String(query.search)), 'i');
    filter.$or = [{ name: re }, { sku: re }, { description: re }];
  }

  if (query.category) {
    // a parent category also returns products of all of its sub-categories
    filter.category = { $in: await categoryService.getSubtreeIds(query.category) };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.effectivePrice = {};
    if (query.minPrice !== undefined) filter.effectivePrice.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined) filter.effectivePrice.$lte = Number(query.maxPrice);
  }

  const sort = SORTS[query.sort] || SORTS.newest;
  const pageInfo = parsePagination(query);

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sort).skip(pageInfo.skip).limit(pageInfo.limit),
    Product.countDocuments(filter),
  ]);
  return { products, pagination: buildPagination(pageInfo, total) };
};

exports.getById = async (id, { adminView = false } = {}) => {
  const product = await findOrFail(id);
  if (!adminView && product.status !== 'active') throw AppError.notFound('Product not found');
  return product;
};

exports.create = async (data) => {
  await ensureCategoryExists(data.category);
  const product = await Product.create(data);
  return product.populate('category', 'name slug');
};

// load + save (instead of findByIdAndUpdate) so validators and the effectivePrice hook always run
exports.update = async (id, data) => {
  const product = await Product.findById(id);
  if (!product) throw AppError.notFound('Product not found');
  if (data.category) await ensureCategoryExists(data.category);
  product.set(data);
  await product.save();
  return product.populate('category', 'name slug');
};

exports.remove = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw AppError.notFound('Product not found');
};

exports.SORT_KEYS = Object.keys(SORTS);
