const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../helpers/testApp');

let t;
let admin;
let customer;
const ids = {};

const create = async (name, parent) => {
  const res = await t.api('POST', '/api/categories', { token: admin, body: { name, parent } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data._id;
};

test.before(async () => {
  t = await start('categories');
  admin = await t.createAdmin();
  customer = (await t.createCustomer('c@test.com')).token;

  // Electronics > Mobiles > Android Phones > Samsung / OnePlus ; Mobiles > iPhones ; Electronics > Computers > Laptops
  ids.electronics = await create('Electronics');
  ids.mobiles = await create('Mobiles', ids.electronics);
  ids.android = await create('Android Phones', ids.mobiles);
  ids.samsung = await create('Samsung', ids.android);
  ids.oneplus = await create('OnePlus', ids.android);
  ids.iphones = await create('iPhones', ids.mobiles);
  ids.computers = await create('Computers', ids.electronics);
  ids.laptops = await create('Laptops', ids.computers);
});
test.after(() => t.stop());

test('only admins can create, update or delete categories', async () => {
  assert.equal((await t.api('POST', '/api/categories', { token: customer, body: { name: 'X' } })).status, 403);
  assert.equal((await t.api('POST', '/api/categories', { body: { name: 'X' } })).status, 401);
  assert.equal((await t.api('PUT', `/api/categories/${ids.samsung}`, { token: customer, body: { name: 'X' } })).status, 403);
  assert.equal((await t.api('DELETE', `/api/categories/${ids.samsung}`, { token: customer })).status, 403);
});

test('the tree endpoint is public and nests every level', async () => {
  const res = await t.api('GET', '/api/categories/tree');
  assert.equal(res.status, 200);
  const [root] = res.body.data;
  assert.equal(root.name, 'Electronics');
  const mobiles = root.children.find((c) => c.name === 'Mobiles');
  const android = mobiles.children.find((c) => c.name === 'Android Phones');
  assert.deepEqual(android.children.map((c) => c.name), ['OnePlus', 'Samsung']);
  assert.deepEqual(root.children.map((c) => c.name), ['Computers', 'Mobiles']);
});

test('ancestors are stored from the root down', async () => {
  const res = await t.api('GET', `/api/categories/${ids.samsung}`);
  assert.deepEqual(res.body.data.ancestors, [ids.electronics, ids.mobiles, ids.android]);
});

test('sibling names must be unique but may repeat under different parents', async () => {
  const dup = await t.api('POST', '/api/categories', { token: admin, body: { name: 'Mobiles', parent: ids.electronics } });
  assert.equal(dup.status, 409);
  const ok = await t.api('POST', '/api/categories', { token: admin, body: { name: 'Samsung', parent: ids.computers } });
  assert.equal(ok.status, 201);
});

test('a category cannot be its own parent or move under its own descendant', async () => {
  const self = await t.api('PUT', `/api/categories/${ids.mobiles}`, { token: admin, body: { parent: ids.mobiles } });
  assert.equal(self.status, 400);
  const child = await t.api('PUT', `/api/categories/${ids.electronics}`, { token: admin, body: { parent: ids.samsung } });
  assert.equal(child.status, 400);
  const grandchild = await t.api('PUT', `/api/categories/${ids.mobiles}`, { token: admin, body: { parent: ids.oneplus } });
  assert.equal(grandchild.status, 400);
  // nothing changed
  const after = await t.api('GET', `/api/categories/${ids.electronics}`);
  assert.equal(after.body.data.parent, null);
});

test('unknown parent is a 404 and a malformed id is a 400', async () => {
  const missing = await t.api('POST', '/api/categories', { token: admin, body: { name: 'Y', parent: '64b000000000000000000000' } });
  assert.equal(missing.status, 404);
  const bad = await t.api('POST', '/api/categories', { token: admin, body: { name: 'Y', parent: 'abc' } });
  assert.equal(bad.status, 400);
});

test('moving a category re-bases the ancestors of its whole subtree', async () => {
  // Android Phones (with Samsung, OnePlus) moves from Mobiles to Computers
  const res = await t.api('PUT', `/api/categories/${ids.android}`, { token: admin, body: { parent: ids.computers } });
  assert.equal(res.status, 200);
  const samsung = await t.api('GET', `/api/categories/${ids.samsung}`);
  assert.deepEqual(samsung.body.data.ancestors, [ids.electronics, ids.computers, ids.android]);

  // and back to a root category
  await t.api('PUT', `/api/categories/${ids.android}`, { token: admin, body: { parent: null } });
  const moved = await t.api('GET', `/api/categories/${ids.samsung}`);
  assert.deepEqual(moved.body.data.ancestors, [ids.android]);
  // restore for later tests
  await t.api('PUT', `/api/categories/${ids.android}`, { token: admin, body: { parent: ids.mobiles } });
});

test('inactive categories are hidden from the public tree but visible to admins', async () => {
  await t.api('PUT', `/api/categories/${ids.computers}`, { token: admin, body: { isActive: false } });
  const pub = await t.api('GET', '/api/categories/tree');
  assert.deepEqual(pub.body.data[0].children.map((c) => c.name), ['Mobiles']);
  const adm = await t.api('GET', '/api/categories/tree?includeInactive=true', { token: admin });
  assert.deepEqual(adm.body.data[0].children.map((c) => c.name), ['Computers', 'Mobiles']);
});

test('deleting is blocked while the category has children or products', async () => {
  const withChildren = await t.api('DELETE', `/api/categories/${ids.mobiles}`, { token: admin });
  assert.equal(withChildren.status, 409);

  await t.api('POST', '/api/products', {
    token: admin,
    body: { name: 'Phone', sku: 'P-1', price: 10, stock: 1, category: ids.iphones },
  });
  const withProducts = await t.api('DELETE', `/api/categories/${ids.iphones}`, { token: admin });
  assert.equal(withProducts.status, 409);

  const leaf = await t.api('DELETE', `/api/categories/${ids.oneplus}`, { token: admin });
  assert.equal(leaf.status, 204);
  assert.equal((await t.api('GET', `/api/categories/${ids.oneplus}`)).status, 404);
});
