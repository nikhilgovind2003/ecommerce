const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../helpers/testApp');

let t;
let admin;
let customer;
const cat = {};

const mkCategory = async (name, parent) =>
  (await t.api('POST', '/api/categories', { token: admin, body: { name, parent } })).body.data._id;

const mkProduct = (body) => t.api('POST', '/api/products', { token: admin, body });
const names = (res) => res.body.data.map((p) => p.name);

test.before(async () => {
  t = await start('products');
  admin = await t.createAdmin();
  customer = (await t.createCustomer('c@test.com')).token;

  cat.electronics = await mkCategory('Electronics');
  cat.mobiles = await mkCategory('Mobiles', cat.electronics);
  cat.android = await mkCategory('Android Phones', cat.mobiles);
  cat.samsung = await mkCategory('Samsung', cat.android);
  cat.computers = await mkCategory('Computers', cat.electronics);
  cat.books = await mkCategory('Books');

  await mkProduct({ name: 'Galaxy S24', sku: 'sam-s24', price: 900, salePrice: 800, stock: 5, category: cat.samsung });
  await mkProduct({ name: 'Galaxy A15', sku: 'SAM-A15', price: 200, stock: 10, category: cat.samsung });
  await mkProduct({ name: 'Laptop Pro', sku: 'LAP-1', price: 1500, stock: 3, category: cat.computers });
  await mkProduct({ name: 'Novel', sku: 'BK-1', price: 15, stock: 30, category: cat.books });
  await mkProduct({ name: 'Hidden Phone', sku: 'HID-1', price: 50, stock: 3, category: cat.mobiles, status: 'inactive' });
});
test.after(() => t.stop());

test('only admins can create products; the SKU is normalised and unique', async () => {
  const body = { name: 'X', sku: 'x-1', price: 1, stock: 1, category: cat.books };
  assert.equal((await t.api('POST', '/api/products', { token: customer, body })).status, 403);
  const created = await mkProduct(body);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.sku, 'X-1');
  assert.equal((await mkProduct({ ...body, sku: 'X-1' })).status, 409);
  await t.api('DELETE', `/api/products/${created.body.data._id}`, { token: admin });
});

test('validation: sale price above price, negative values, missing fields, unknown category', async () => {
  const base = { name: 'V', sku: 'V-1', price: 10, stock: 1, category: cat.books };
  assert.equal((await mkProduct({ ...base, salePrice: 20 })).status, 400);
  assert.equal((await mkProduct({ ...base, price: -1 })).status, 400);
  assert.equal((await mkProduct({ ...base, stock: -5 })).status, 400);
  assert.equal((await mkProduct({ name: 'only name' })).status, 400);
  assert.equal((await mkProduct({ ...base, category: '64b000000000000000000000' })).status, 400);
});

test('customers only see active products', async () => {
  const res = await t.api('GET', '/api/products');
  assert.equal(res.status, 200);
  assert.ok(!names(res).includes('Hidden Phone'));
  assert.equal(res.body.pagination.total, 4);
});

test('filtering by a parent category includes every sub-category', async () => {
  const electronics = await t.api('GET', `/api/products?category=${cat.electronics}`);
  assert.deepEqual(names(electronics).sort(), ['Galaxy A15', 'Galaxy S24', 'Laptop Pro']);
  const mobiles = await t.api('GET', `/api/products?category=${cat.mobiles}`);
  assert.deepEqual(names(mobiles).sort(), ['Galaxy A15', 'Galaxy S24']);
  const books = await t.api('GET', `/api/products?category=${cat.books}`);
  assert.deepEqual(names(books), ['Novel']);
});

test('search matches name and SKU, case-insensitively, and treats input literally', async () => {
  assert.deepEqual(names(await t.api('GET', '/api/products?search=GALAXY')).sort(), ['Galaxy A15', 'Galaxy S24']);
  assert.deepEqual(names(await t.api('GET', '/api/products?search=lap-1')), ['Laptop Pro']);
  const weird = await t.api('GET', `/api/products?search=${encodeURIComponent('(*')}`);
  assert.equal(weird.status, 200);
  assert.equal(weird.body.data.length, 0);
});

test('price filters use the sale price when there is one', async () => {
  // S24 costs 900 but sells at 800
  const res = await t.api('GET', '/api/products?minPrice=700&maxPrice=850');
  assert.deepEqual(names(res), ['Galaxy S24']);
  assert.equal((await t.api('GET', '/api/products?minPrice=10&maxPrice=5')).status, 400);
});

test('sorting and pagination', async () => {
  const asc = await t.api('GET', '/api/products?sort=price_asc');
  assert.deepEqual(names(asc), ['Novel', 'Galaxy A15', 'Galaxy S24', 'Laptop Pro']);
  const desc = await t.api('GET', '/api/products?sort=price_desc');
  assert.equal(names(desc)[0], 'Laptop Pro');

  const p2 = await t.api('GET', '/api/products?sort=name_asc&limit=2&page=2');
  assert.deepEqual(names(p2), ['Laptop Pro', 'Novel']);
  assert.deepEqual(p2.body.pagination, { page: 2, limit: 2, total: 4, pages: 2 });

  assert.equal((await t.api('GET', '/api/products?sort=bogus')).status, 400);
  assert.equal((await t.api('GET', '/api/products?limit=1000')).status, 400);
});

test('admin listing includes inactive products; inactive detail is hidden from customers', async () => {
  const all = await t.api('GET', '/api/products/admin/all', { token: admin });
  assert.equal(all.body.pagination.total, 5);
  assert.equal((await t.api('GET', '/api/products/admin/all', { token: customer })).status, 403);

  const hidden = all.body.data.find((p) => p.name === 'Hidden Phone');
  assert.equal((await t.api('GET', `/api/products/${hidden._id}`)).status, 404);
  assert.equal((await t.api('GET', `/api/products/${hidden._id}`, { token: admin })).status, 200);
});

test('updating the sale price recalculates the effective price; null clears it', async () => {
  const [laptop] = (await t.api('GET', '/api/products?search=laptop')).body.data;
  const sale = await t.api('PUT', `/api/products/${laptop._id}`, { token: admin, body: { salePrice: 1200 } });
  assert.equal(sale.body.data.effectivePrice, 1200);
  assert.equal((await t.api('PUT', `/api/products/${laptop._id}`, { token: admin, body: { salePrice: 9999 } })).status, 400);
  const cleared = await t.api('PUT', `/api/products/${laptop._id}`, { token: admin, body: { salePrice: null } });
  assert.equal(cleared.body.data.effectivePrice, 1500);
});
