// Run with `npm run seed:data`. Adds sample categories and products. Safe to re-run: existing rows are skipped.
import 'dotenv/config';
import mongoose from 'mongoose';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import ProductService from '../../modules/products/productService.js';
import { slugify } from '../../utils/slug.js';

const TREE = [
  {
    name: 'Electronics',
    children: [
      {
        name: 'Mobiles',
        children: [
          { name: 'Android Phones', children: [{ name: 'Samsung' }, { name: 'OnePlus' }] },
          { name: 'iPhones' },
        ],
      },
      { name: 'Computers', children: [{ name: 'Laptops' }, { name: 'Desktops' }] },
    ],
  },
];

// category = name of the (unique) leaf category the product belongs to
const PRODUCTS = [
  { sku: 'SAM-S24', name: 'Samsung Galaxy S24', category: 'Samsung', price: 79999, salePrice: 74999, stock: 25, description: '6.2" AMOLED, 8GB RAM, 256GB storage.' },
  { sku: 'SAM-A55', name: 'Samsung Galaxy A55', category: 'Samsung', price: 39999, stock: 40, description: '6.6" Super AMOLED, 8GB RAM, 128GB storage.' },
  { sku: 'OP-12', name: 'OnePlus 12', category: 'OnePlus', price: 64999, salePrice: 61999, stock: 30, description: 'Snapdragon 8 Gen 3, 12GB RAM, 256GB storage.' },
  { sku: 'OP-NORD4', name: 'OnePlus Nord 4', category: 'OnePlus', price: 29999, stock: 50, description: 'Metal unibody, 8GB RAM, 128GB storage.' },
  { sku: 'APL-IP15', name: 'Apple iPhone 15', category: 'iPhones', price: 79900, salePrice: 72900, stock: 20, description: 'A16 Bionic, 48MP camera, 128GB storage.' },
  { sku: 'APL-IP15P', name: 'Apple iPhone 15 Pro', category: 'iPhones', price: 134900, stock: 12, description: 'A17 Pro, titanium design, 256GB storage.' },
  { sku: 'APL-MBA13', name: 'Apple MacBook Air 13" M3', category: 'Laptops', price: 114900, stock: 15, description: 'M3 chip, 8GB RAM, 256GB SSD.' },
  { sku: 'DEL-XPS13', name: 'Dell XPS 13', category: 'Laptops', price: 124990, salePrice: 112990, stock: 10, description: 'Intel Core Ultra 7, 16GB RAM, 512GB SSD.' },
  { sku: 'HP-PAV-TP01', name: 'HP Pavilion Desktop TP01', category: 'Desktops', price: 54990, stock: 8, description: 'Ryzen 5, 16GB RAM, 512GB SSD.' },
  { sku: 'LEN-IC-5', name: 'Lenovo IdeaCentre 5', category: 'Desktops', price: 47990, salePrice: 44990, stock: 0, status: 'inactive', description: 'Core i5, 8GB RAM, 1TB HDD. Out of stock.' },
];

const stats = { categoriesCreated: 0, categoriesExisting: 0, productsCreated: 0, productsExisting: 0 };
const idsByName = {};

async function seedCategories(nodes, parent = null) {
  for (const { name, children } of nodes) {
    let category = await Category.findOne({ parent: parent?._id ?? null, name });
    if (category) {
      stats.categoriesExisting++;
    } else {
      category = await Category.create({
        name,
        slug: slugify(name),
        parent: parent?._id ?? null,
        ancestors: parent ? [...parent.ancestors, parent._id] : [],
      });
      stats.categoriesCreated++;
    }
    idsByName[name] = category._id;
    if (children) await seedCategories(children, category);
  }
}

(async function () {
  const { MONGO_URI } = process.env;
  if (!MONGO_URI) {
    console.error('MONGO_URI must be set in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);

  await seedCategories(TREE);

  for (const { category, ...data } of PRODUCTS) {
    const sku = data.sku.toUpperCase();
    if (await Product.exists({ sku })) {
      stats.productsExisting++;
    } else {
      await Product.create({
        ...data,
        category: idsByName[category],
        effectivePrice: ProductService.computeEffectivePrice(data.price, data.salePrice),
      });
      stats.productsCreated++;
    }
  }

  console.log(stats);
  await mongoose.disconnect();
})().catch(function (err) {
  console.error(err.message);
  process.exit(1);
});
