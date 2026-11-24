// Handles HTTP for /api/categories.
import asyncHandler from '../../utils/asyncHandler.js';
import CategoryService from './categoryService.js';

class CategoryController {
  static tree = asyncHandler(async function (req, res) {
    // Only admins may ask to see inactive branches.
    const isAdmin = req.user?.role === 'admin';
    const includeInactive = isAdmin && req.query.includeInactive === 'true';
    const tree = await CategoryService.getCategoryTree({ includeInactive });
    res.status(200).json({ status: 'success', message: 'Category tree fetched successfully', data: tree });
  });

  static list = asyncHandler(async function (req, res) {
    const categories = await CategoryService.listCategories(req.query);
    res.status(200).json({ status: 'success', message: 'Categories fetched successfully', data: categories });
  });

  static getOne = asyncHandler(async function (req, res) {
    const category = await CategoryService.getCategoryById(req.params.id);
    res.status(200).json({ status: 'success', message: 'Category fetched successfully', data: category });
  });

  static create = asyncHandler(async function (req, res) {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json({ status: 'success', message: 'Category created successfully', data: category });
  });

  static update = asyncHandler(async function (req, res) {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    res.status(200).json({ status: 'success', message: 'Category updated successfully', data: category });
  });

  static remove = asyncHandler(async function (req, res) {
    await CategoryService.removeCategory(req.params.id);
    res.status(200).json({ status: 'success', message: 'Category deleted successfully', data: null });
  });
}

export default CategoryController;
