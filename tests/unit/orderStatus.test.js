const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransition, STATUSES } = require('../../src/utils/orderStatus');

test('the happy path moves forward one step at a time', () => {
  const path = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  for (let i = 0; i < path.length - 1; i++) assert.ok(canTransition(path[i], path[i + 1]), `${path[i]} -> ${path[i + 1]}`);
});

test('orders can be cancelled until they ship', () => {
  ['pending', 'confirmed', 'processing'].forEach((s) => assert.ok(canTransition(s, 'cancelled')));
  ['shipped', 'delivered'].forEach((s) => assert.equal(canTransition(s, 'cancelled'), false));
});

test('statuses cannot be skipped or reversed, and final states are final', () => {
  assert.equal(canTransition('pending', 'shipped'), false);
  assert.equal(canTransition('shipped', 'processing'), false);
  STATUSES.forEach((s) => {
    assert.equal(canTransition('delivered', s), false);
    assert.equal(canTransition('cancelled', s), false);
  });
});
