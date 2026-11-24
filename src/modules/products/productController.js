// Handles HTTP for /api/products.
import asyncHandler from '../../utils/asyncHandler.js';
import ProductService from './productService.js';

class ProductController {
  // Storefront list: active products only.
  static list = asyncHandler(async function (req, res) {
    const { products, pagination } = await ProductService.listProducts(req.query);
    res.status(200).json({ status: 'success', message: 'Products fetched successfully', data: products, pagination });
  });

  // Admin list: every product, can filter by status.
  static adminList = asyncHandler(async function (req, res) {
    const { products, pagination } = await ProductService.listProducts(req.query, { adminView: true });
    res.status(200).json({ status: 'success', message: 'Products fetched successfully', data: products, pagination });
  });

  static getOne = asyncHandler(async function (req, res) {
    const adminView = req.user?.role === 'admin';
    const product = await ProductService.getProductById(req.params.id, { adminView });
    res.status(200).json({ status: 'success', message: 'Product fetched successfully', data: product });
  });

  static create = asyncHandler(async function (req, res) {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({ status: 'success', message: 'Product created successfully', data: product });
  });

  static update = asyncHandler(async function (req, res) {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    res.status(200).json({ status: 'success', message: 'Product updated successfully', data: product });
  });

  static remove = asyncHandler(async function (req, res) {
    await ProductService.removeProduct(req.params.id);
    res.status(200).json({ status: 'success', message: 'Product deleted successfully', data: null });
  });
}

export default ProductController;
