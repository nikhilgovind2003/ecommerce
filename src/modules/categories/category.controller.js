// Handles HTTP for /api/categories.
import BaseController from '../../shared/BaseController.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import categoryService from './category.service.js';

class CategoryController extends BaseController {
  tree = asyncHandler(async (req, res) => {
    // Only admins may ask to see inactive branches.
    const isAdmin = req.user?.role === 'admin';
    const includeInactive = isAdmin && req.query.includeInactive === 'true';
    this.ok(res, await categoryService.getTree({ includeInactive }));
  });

  list = asyncHandler(async (req, res) => {
    this.ok(res, await categoryService.list(req.query));
  });

  getOne = asyncHandler(async (req, res) => {
    this.ok(res, await categoryService.getById(req.params.id));
  });

  create = asyncHandler(async (req, res) => {
    this.created(res, await categoryService.create(req.body));
  });

  update = asyncHandler(async (req, res) => {
    this.ok(res, await categoryService.update(req.params.id, req.body));
  });

  remove = asyncHandler(async (req, res) => {
    await categoryService.remove(req.params.id);
    this.noContent(res);
  });
}

export default new CategoryController();
