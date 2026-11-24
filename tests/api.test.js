// Integration tests: the real Express app against an in-memory MongoDB. Run with `npm test`.
import './setup.js'; // must come first: sets the env vars before the app loads
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/database/models/userModel.js';
import Product from '../src/database/models/productModel.js';
import { hashPassword } from '../src/utils/password.js';

let mongod;
const address = { fullName: 'A B', phone: '1', line1: 'x', city: 'c', postalCode: '1', country: 'IN' };

before(async function () {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map(function (m) { return m.init(); }));
});

after(async function () {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async function () {
  await Promise.all(Object.values(mongoose.models).map(function (m) { return m.deleteMany({}); }));
});

async function makeAdmin() {
  await User.create({ name: 'Admin', email: 'admin@t.com', password: await hashPassword('secret123'), role: 'admin' });
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@t.com', password: 'secret123' });
  return res.body.data.token;
}

async function makeCustomer(email = 'c@t.com') {
  const res = await request(app).post('/api/auth/register').send({ name: 'Cust', email, password: 'secret123' });
  return res.body.data.token;
}

const auth = function (token) { return { Authorization: `Bearer ${token}` }; };

async function makeCategory(token, name, parent) {
  const res = await request(app).post('/api/categories').set(auth(token)).send({ name, parent });
  assert.equal(res.status, 201);
  return res.body.data._id;
}

async function makeProduct(token, category, overrides = {}) {
  const res = await request(app).post('/api/products').set(auth(token)).send({
    name: 'Phone', sku: `sku-${Math.random()}`, price: 100, stock: 5, category, ...overrides,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}

describe('auth and users', function () {
  it('registers a customer and ignores a requested admin role', async function () {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'X', email: 'x@t.com', password: 'secret123', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'customer');
    assert.equal(res.body.data.user.password, undefined);
  });

  it('rejects a wrong password and a duplicate email', async function () {
    await makeCustomer();
    const bad = await request(app).post('/api/auth/login').send({ email: 'c@t.com', password: 'nope-nope' });
    assert.equal(bad.status, 401);
    const dup = await request(app).post('/api/auth/register').send({ name: 'C', email: 'c@t.com', password: 'secret123' });
    assert.equal(dup.status, 409);
  });

  it('blocks customers from the admin user list and without a token', async function () {
    const customer = await makeCustomer();
    assert.equal((await request(app).get('/api/users')).status, 401);
    assert.equal((await request(app).get('/api/users').set(auth(customer))).status, 403);
  });

  it('lets an admin deactivate a user, who is then locked out', async function () {
    const admin = await makeAdmin();
    const customer = await makeCustomer();
    const user = await User.findOne({ email: 'c@t.com' });
    const res = await request(app).patch(`/api/users/${user._id}/status`).set(auth(admin)).send({ isActive: false });
    assert.equal(res.status, 200);
    assert.equal((await request(app).get('/api/auth/me').set(auth(customer))).status, 403);
  });
});

describe('categories', function () {
  it('builds a nested tree of any depth', async function () {
    const admin = await makeAdmin();
    const e = await makeCategory(admin, 'Electronics');
    const m = await makeCategory(admin, 'Mobiles', e);
    const a = await makeCategory(admin, 'Android', m);
    await makeCategory(admin, 'Samsung', a);
    const res = await request(app).get('/api/categories/tree');
    assert.equal(res.status, 200);
    assert.equal(res.body.data[0].children[0].children[0].children[0].name, 'Samsung');
  });

  it('rejects circular parent links', async function () {
    const admin = await makeAdmin();
    const a = await makeCategory(admin, 'A');
    const b = await makeCategory(admin, 'B', a);
    const self = await request(app).put(`/api/categories/${a}`).set(auth(admin)).send({ parent: a });
    assert.equal(self.status, 400);
    const loop = await request(app).put(`/api/categories/${a}`).set(auth(admin)).send({ parent: b });
    assert.equal(loop.status, 400);
  });

  it('refuses to delete a category that has children', async function () {
    const admin = await makeAdmin();
    const a = await makeCategory(admin, 'A');
    await makeCategory(admin, 'B', a);
    assert.equal((await request(app).delete(`/api/categories/${a}`).set(auth(admin))).status, 409);
  });
});

describe('products', function () {
  it('includes sub-category products when filtering by a parent, and filters by price', async function () {
    const admin = await makeAdmin();
    const parent = await makeCategory(admin, 'Electronics');
    const child = await makeCategory(admin, 'Phones', parent);
    const other = await makeCategory(admin, 'Books');
    await makeProduct(admin, child, { name: 'Cheap phone', price: 50 });
    await makeProduct(admin, child, { name: 'Pricey phone', price: 500, salePrice: 400 });
    await makeProduct(admin, other, { name: 'Novel', price: 10 });

    const all = await request(app).get(`/api/products?category=${parent}`);
    assert.equal(all.body.data.length, 2);

    const priced = await request(app).get(`/api/products?category=${parent}&minPrice=100&sort=price_desc`);
    assert.equal(priced.body.data.length, 1);
    assert.equal(priced.body.data[0].effectivePrice, 400);

    const search = await request(app).get('/api/products?search=novel');
    assert.equal(search.body.data.length, 1);
  });

  it('rejects a sale price above the price and a missing category', async function () {
    const admin = await makeAdmin();
    const c = await makeCategory(admin, 'C');
    const res = await request(app).post('/api/products').set(auth(admin))
      .send({ name: 'P', sku: 'a1', price: 10, salePrice: 20, stock: 1, category: c });
    assert.equal(res.status, 400);
    const missing = await request(app).post('/api/products').set(auth(admin))
      .send({ name: 'P', sku: 'a2', price: 10, stock: 1, category: new mongoose.Types.ObjectId() });
    assert.equal(missing.status, 400);
  });

  it('only lets admins create products', async function () {
    const customer = await makeCustomer();
    const res = await request(app).post('/api/products').set(auth(customer)).send({});
    assert.equal(res.status, 403);
  });
});

describe('orders', function () {
  async function setup() {
    const admin = await makeAdmin();
    const customer = await makeCustomer();
    const cat = await makeCategory(admin, 'C');
    const product = await makeProduct(admin, cat, { price: 100, salePrice: 80, stock: 5 });
    return { admin, customer, product };
  }

  const place = function (token, product, quantity) {
    return request(app).post('/api/orders').set(auth(token))
      .send({ items: [{ product, quantity }], shippingAddress: address });
  };

  it('prices the order on the server and reduces stock', async function () {
    const { customer, product } = await setup();
    const res = await place(customer, product._id, 2);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.totalAmount, 160);
    assert.equal((await Product.findById(product._id)).stock, 3);
  });

  it('rejects an order above the available stock without touching it', async function () {
    const { customer, product } = await setup();
    const res = await place(customer, product._id, 6);
    assert.equal(res.status, 400);
    assert.equal((await Product.findById(product._id)).stock, 5);
  });

  it('never oversells when orders race for the last items', async function () {
    const { customer, product } = await setup();
    const results = await Promise.all(Array.from({ length: 8 }, function () { return place(customer, product._id, 1); }));
    const created = results.filter(function (r) { return r.status === 201; }).length;
    assert.equal(created, 5);
    assert.equal((await Product.findById(product._id)).stock, 0);
  });

  it('keeps orders private to their owner, but visible to admins', async function () {
    const { admin, customer, product } = await setup();
    const other = await makeCustomer('other@t.com');
    const id = (await place(customer, product._id, 1)).body.data._id;
    assert.equal((await request(app).get(`/api/orders/my/${id}`).set(auth(other))).status, 404);
    assert.equal((await request(app).get(`/api/orders/my/${id}`).set(auth(customer))).status, 200);
    const list = await request(app).get('/api/orders').set(auth(admin));
    assert.equal(list.status, 200);
    assert.equal((await request(app).get('/api/orders').set(auth(customer))).status, 403);
  });

  it('follows the status flow and restocks on cancel', async function () {
    const { admin, customer, product } = await setup();
    const id = (await place(customer, product._id, 2)).body.data._id;
    const skip = await request(app).patch(`/api/orders/${id}/status`).set(auth(admin)).send({ status: 'delivered' });
    assert.equal(skip.status, 400);
    const ok = await request(app).patch(`/api/orders/${id}/status`).set(auth(admin)).send({ status: 'confirmed' });
    assert.equal(ok.status, 200);
    const cancel = await request(app).patch(`/api/orders/${id}/status`).set(auth(admin)).send({ status: 'cancelled' });
    assert.equal(cancel.status, 200);
    assert.equal((await Product.findById(product._id)).stock, 5);
    const again = await request(app).patch(`/api/orders/${id}/status`).set(auth(admin)).send({ status: 'cancelled' });
    assert.equal(again.status, 400);
  });
});
