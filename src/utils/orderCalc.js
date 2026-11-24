// Money is handled in integer cents to avoid floating point drift (0.1 + 0.2 style bugs).
const toCents = (amount) => Math.round(amount * 100);

/**
 * Combines duplicate product lines: [{product:'a',quantity:1},{product:'a',quantity:2}] -> a x3
 */
const mergeItems = (items) => {
  const merged = new Map();
  items.forEach(({ product, quantity }) => {
    const key = String(product);
    merged.set(key, (merged.get(key) || 0) + Number(quantity));
  });
  return [...merged].map(([product, quantity]) => ({ product, quantity }));
};

/**
 * items: [{ price, quantity }] with price taken from the database, never from the client.
 * Returns the items with a subtotal plus the order total.
 */
const calculateTotals = (items) => {
  let totalCents = 0;
  const priced = items.map((item) => {
    const subtotalCents = toCents(item.price) * item.quantity;
    totalCents += subtotalCents;
    return { ...item, subtotal: subtotalCents / 100 };
  });
  return { items: priced, totalAmount: totalCents / 100 };
};

module.exports = { mergeItems, calculateTotals };
