// Handles HTTP for /api/products.
import BaseController from '../../shared/BaseController.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import productService from './product.service.js';

class ProductController extends BaseController {
  // Storefront list: active products only.
  list = asyncHandler(async (req, res) => {
    const { products, pagination } = await productService.list(req.query);
    this.ok(res, products, pagination);
  });

  // Admin list: every product, can filter by status.
  adminList = asyncHandler(async (req, res) => {
    const { products, pagination } = await productService.list(req.query, { adminView: true });
    this.ok(res, products, pagination);
  });

  getOne = asyncHandler(async (req, res) => {
    const adminView = req.user?.role === 'admin';
    this.ok(res, await productService.getById(req.params.id, { adminView }));
  });

  create = asyncHandler(async (req, res) => {
    this.created(res, await productService.create(req.body));
  });

  update = asyncHandler(async (req, res) => {
    this.ok(res, await productService.update(req.params.id, req.body));
  });

  remove = asyncHandler(async (req, res) => {
    await productService.remove(req.params.id);
    this.noContent(res);
  });
}

export default new ProductController();
