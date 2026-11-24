const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../helpers/testApp');

let t;
let admin;
test.before(async () => {
  t = await start('auth');
  admin = await t.createAdmin();
});
test.after(() => t.stop());

test('register always creates a customer, even if a role is sent', async () => {
  const res = await t.api('POST', '/api/auth/register', {
    body: { name: 'Eve', email: 'eve@test.com', password: 'secret1', role: 'admin' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.user.role, 'customer');
  assert.equal(res.body.data.user.password, undefined);
});

test('register validates input and rejects duplicate emails', async () => {
  const bad = await t.api('POST', '/api/auth/register', { body: { name: '', email: 'nope', password: '1' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.length >= 3);

  const dup = await t.api('POST', '/api/auth/register', { body: { name: 'Eve', email: 'eve@test.com', password: 'secret1' } });
  assert.equal(dup.status, 409);
});

test('login: wrong password is 401, correct password returns a token', async () => {
  const wrong = await t.api('POST', '/api/auth/login', { body: { email: 'eve@test.com', password: 'wrong!!' } });
  assert.equal(wrong.status, 401);
  const ok = await t.api('POST', '/api/auth/login', { body: { email: 'eve@test.com', password: 'secret1' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.data.token);
});

test('protected routes need a valid token', async () => {
  assert.equal((await t.api('GET', '/api/auth/me')).status, 401);
  assert.equal((await t.api('GET', '/api/auth/me', { token: 'garbage' })).status, 401);
});

test('customers cannot use admin routes, admins can', async () => {
  const { token } = await t.createCustomer('plain@test.com');
  assert.equal((await t.api('GET', '/api/users', { token })).status, 403);
  const list = await t.api('GET', '/api/users', { token: admin });
  assert.equal(list.status, 200);
  assert.ok(list.body.pagination.total >= 2);
});

test('deactivated users are locked out immediately and can be re-activated', async () => {
  const { token, id } = await t.createCustomer('lock@test.com');
  assert.equal((await t.api('GET', '/api/auth/me', { token })).status, 200);

  const off = await t.api('PATCH', `/api/users/${id}/status`, { token: admin, body: { isActive: false } });
  assert.equal(off.status, 200);
  assert.equal((await t.api('GET', '/api/auth/me', { token })).status, 403);
  const login = await t.api('POST', '/api/auth/login', { body: { email: 'lock@test.com', password: 'secret1' } });
  assert.equal(login.status, 403);

  await t.api('PATCH', `/api/users/${id}/status`, { token: admin, body: { isActive: true } });
  assert.equal((await t.api('GET', '/api/auth/me', { token })).status, 200);
});

test('an admin cannot deactivate their own account', async () => {
  const me = await t.api('GET', '/api/auth/me', { token: admin });
  const res = await t.api('PATCH', `/api/users/${me.body.data._id}/status`, { token: admin, body: { isActive: false } });
  assert.equal(res.status, 400);
});

test('profile update changes the name and requires the current password for a new one', async () => {
  const { token } = await t.createCustomer('prof@test.com');
  const name = await t.api('PUT', '/api/users/me', { token, body: { name: 'New Name' } });
  assert.equal(name.body.data.name, 'New Name');
  const bad = await t.api('PUT', '/api/users/me', { token, body: { password: 'another1', currentPassword: 'wrong' } });
  assert.equal(bad.status, 400);
  const good = await t.api('PUT', '/api/users/me', { token, body: { password: 'another1', currentPassword: 'secret1' } });
  assert.equal(good.status, 200);
  const login = await t.api('POST', '/api/auth/login', { body: { email: 'prof@test.com', password: 'another1' } });
  assert.equal(login.status, 200);
});
