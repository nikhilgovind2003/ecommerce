const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../helpers/testApp');

let t;
let admin;
let alice;
let bob;
let categoryId;

const address = { fullName: 'A B', phone: '123', line1: '1 Street', city: 'Kochi', postalCode: '682001', country: 'IN' };
const place = (user, items) => t.api('POST', '/api/orders', { token: user.token, body: { items, shippingAddress: address } });
const mkProduct = async (name, price, stock, extra = {}) =>
  (await t.api('POST', '/api/products', {
    token: admin,
    body: { name, sku: name.toUpperCase().replace(/\s/g, '-'), price, stock, category: categoryId, ...extra },
  })).body.data._id;
const stockOf = async (id) => (await t.api('GET', `/api/products/${id}`)).body.data.stock;

test.before(async () => {
  t = await start('orders');
  admin = await t.createAdmin();
  alice = await t.createCustomer('alice@test.com');
  bob = await t.createCustomer('bob@test.com');
  categoryId = (await t.api('POST', '/api/categories', { token: admin, body: { name: 'Gadgets' } })).body.data._id;
});
test.after(() => t.stop());

test('anonymous users and admins cannot place orders', async () => {
  const p = await mkProduct('Anon Item', 5, 5);
  const anon = await t.api('POST', '/api/orders', { body: { items: [{ product: p, quantity: 1 }], shippingAddress: address } });
  assert.equal(anon.status, 401);
  const asAdmin = await t.api('POST', '/api/orders', { token: admin, body: { items: [{ product: p, quantity: 1 }], shippingAddress: address } });
  assert.equal(asAdmin.status, 403);
});

test('totals are calculated on the server; client prices are ignored; duplicate lines merge', async () => {
  const widget = await mkProduct('Widget', 10.1, 10, { salePrice: 9.99 });
  const gadget = await mkProduct('Gadget', 0.1, 5);

  const res = await place(alice, [
    { product: widget, quantity: 2, price: 0.01 }, // client-supplied price must be ignored
    { product: widget, quantity: 1 },
    { product: gadget, quantity: 3 },
  ]);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const order = res.body.data;
  assert.equal(order.status, 'pending');
  assert.equal(order.items.length, 2);
  const w = order.items.find((i) => i.name === 'Widget');
  assert.deepEqual([w.price, w.quantity, w.subtotal], [9.99, 3, 29.97]);
  assert.equal(order.totalAmount, 30.27);

  assert.equal(await stockOf(widget), 7);
  assert.equal(await stockOf(gadget), 2);
});

test('an order the stock cannot cover is rejected as a whole and changes nothing', async () => {
  const plenty = await mkProduct('Plenty', 1, 10);
  const scarce = await mkProduct('Scarce', 1, 2);
  const res = await place(alice, [{ product: plenty, quantity: 3 }, { product: scarce, quantity: 5 }]);
  assert.equal(res.status, 400);
  assert.match(res.body.errors[0].message, /Only 2 left/);
  assert.equal(await stockOf(plenty), 10);
  assert.equal(await stockOf(scarce), 2);
});

test('inactive and unknown products cannot be ordered', async () => {
  const off = await mkProduct('Off', 1, 5, { status: 'inactive' });
  assert.equal((await place(alice, [{ product: off, quantity: 1 }])).status, 400);
  assert.equal((await place(alice, [{ product: '64b000000000000000000000', quantity: 1 }])).status, 400);
});

test('request validation: empty cart, zero quantity, missing address', async () => {
  const p = await mkProduct('Valid Item', 1, 5);
  assert.equal((await place(alice, [])).status, 400);
  assert.equal((await place(alice, [{ product: p, quantity: 0 }])).status, 400);
  const noAddress = await t.api('POST', '/api/orders', { token: alice.token, body: { items: [{ product: p, quantity: 1 }] } });
  assert.equal(noAddress.status, 400);
});

test('concurrent orders for the last unit: exactly one succeeds and stock never goes negative', async () => {
  const last = await mkProduct('Last One', 99, 1);
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) => place(i % 2 ? alice : bob, [{ product: last, quantity: 1 }]))
  );
  const created = results.filter((r) => r.status === 201);
  assert.equal(created.length, 1);
  assert.ok(results.filter((r) => r.status !== 201).every((r) => [400, 409].includes(r.status)));
  assert.equal(await stockOf(last), 0);
});

test('when a multi-item order fails midway, stock reserved for earlier items is given back', async () => {
  const a = await mkProduct('Race A', 5, 2);
  const b = await mkProduct('Race B', 5, 1);
  const results = await Promise.all(
    Array.from({ length: 4 }, () => place(bob, [{ product: a, quantity: 1 }, { product: b, quantity: 1 }]))
  );
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(await stockOf(a), 1); // only the winner kept its unit of A
  assert.equal(await stockOf(b), 0);
});

test('customers only see their own orders', async () => {
  const p = await mkProduct('Private', 5, 5);
  const order = (await place(alice, [{ product: p, quantity: 1 }])).body.data;

  assert.equal((await t.api('GET', `/api/orders/my/${order._id}`, { token: alice.token })).status, 200);
  assert.equal((await t.api('GET', `/api/orders/my/${order._id}`, { token: bob.token })).status, 404);
  assert.equal((await t.api('PATCH', `/api/orders/my/${order._id}/cancel`, { token: bob.token })).status, 404);

  const bobList = await t.api('GET', '/api/orders/my', { token: bob.token });
  assert.ok(bobList.body.data.every((o) => o.user === bob.id));
  assert.equal((await t.api('GET', '/api/orders', { token: alice.token })).status, 403);
  assert.equal((await t.api('GET', `/api/orders/${order._id}`, { token: alice.token })).status, 403);
});

test('admin sees every order and walks it through the status flow', async () => {
  const p = await mkProduct('Flow', 5, 5);
  const order = (await place(alice, [{ product: p, quantity: 1 }])).body.data;
  const set = (status) => t.api('PATCH', `/api/orders/${order._id}/status`, { token: admin, body: { status } });

  const all = await t.api('GET', '/api/orders', { token: admin });
  assert.ok(all.body.pagination.total >= 1);
  assert.equal((await t.api('GET', '/api/orders?status=pending', { token: admin })).status, 200);

  assert.equal((await set('shipped')).status, 400); // cannot skip steps
  assert.equal((await set('bogus')).status, 400);
  for (const status of ['confirmed', 'processing', 'shipped', 'delivered']) {
    const res = await set(status);
    assert.equal(res.status, 200, `${status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.data.status, status);
  }
  assert.equal((await set('cancelled')).status, 400); // delivered is final

  const final = await t.api('GET', `/api/orders/${order._id}`, { token: admin });
  assert.deepEqual(final.body.data.statusHistory.map((h) => h.status), ['pending', 'confirmed', 'processing', 'shipped', 'delivered']);
  assert.equal(await stockOf(p), 4); // delivering does not touch stock
});

test('cancelling gives the stock back exactly once, even if requested twice at once', async () => {
  const p = await mkProduct('Cancelable', 5, 10);
  const order = (await place(alice, [{ product: p, quantity: 4 }])).body.data;
  assert.equal(await stockOf(p), 6);

  const results = await Promise.all([
    t.api('PATCH', `/api/orders/my/${order._id}/cancel`, { token: alice.token }),
    t.api('PATCH', `/api/orders/my/${order._id}/cancel`, { token: alice.token }),
  ]);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(await stockOf(p), 10);
});

test('customers cannot cancel once the order is past pending; admin cancel also restores stock', async () => {
  const p = await mkProduct('Late Cancel', 5, 10);
  const order = (await place(alice, [{ product: p, quantity: 2 }])).body.data;
  await t.api('PATCH', `/api/orders/${order._id}/status`, { token: admin, body: { status: 'confirmed' } });

  assert.equal((await t.api('PATCH', `/api/orders/my/${order._id}/cancel`, { token: alice.token })).status, 400);
  const adminCancel = await t.api('PATCH', `/api/orders/${order._id}/status`, { token: admin, body: { status: 'cancelled' } });
  assert.equal(adminCancel.status, 200);
  assert.equal(await stockOf(p), 10);
});

test('order history keeps the product snapshot after the product is deleted', async () => {
  const p = await mkProduct('Short Lived', 7.5, 3);
  const order = (await place(alice, [{ product: p, quantity: 2 }])).body.data;
  await t.api('DELETE', `/api/products/${p}`, { token: admin });
  const res = await t.api('GET', `/api/orders/my/${order._id}`, { token: alice.token });
  assert.equal(res.body.data.items[0].name, 'Short Lived');
  assert.equal(res.body.data.totalAmount, 15);
});
