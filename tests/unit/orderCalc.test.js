const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeItems, calculateTotals } = require('../../src/utils/orderCalc');

test('mergeItems adds up duplicate product lines', () => {
  const merged = mergeItems([
    { product: 'a', quantity: 1 },
    { product: 'b', quantity: 2 },
    { product: 'a', quantity: 3 },
  ]);
  assert.deepEqual(merged, [
    { product: 'a', quantity: 4 },
    { product: 'b', quantity: 2 },
  ]);
});

test('calculateTotals computes subtotals and total from server prices', () => {
  const { items, totalAmount } = calculateTotals([
    { price: 9.99, quantity: 3 },
    { price: 0.1, quantity: 3 },
  ]);
  assert.deepEqual(items.map((i) => i.subtotal), [29.97, 0.3]);
  assert.equal(totalAmount, 30.27);
});

test('calculateTotals avoids floating point drift', () => {
  // 0.1 * 3 === 0.30000000000000004 with plain floats
  assert.equal(calculateTotals([{ price: 0.1, quantity: 3 }]).totalAmount, 0.3);
  assert.equal(calculateTotals([{ price: 19.99, quantity: 100 }]).totalAmount, 1999);
});
