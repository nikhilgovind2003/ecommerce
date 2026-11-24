// Pure helpers (no DB access) so they are easy to unit test.

const sortByName = (nodes) => nodes.sort((a, b) => a.name.localeCompare(b.name));

/**
 * Turns a flat list of categories into a nested tree in O(n).
 * Works for any depth because it links nodes through a lookup map instead of recursing.
 * Nodes whose parent is missing from the list become roots.
 */
const buildTree = (categories) => {
  const nodes = new Map();
  categories.forEach((c) => {
    const plain = typeof c.toObject === 'function' ? c.toObject() : { ...c };
    nodes.set(String(plain._id), { ...plain, children: [] });
  });

  const roots = [];
  nodes.forEach((node) => {
    const parent = node.parent ? nodes.get(String(node.parent)) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  nodes.forEach((node) => sortByName(node.children));
  return sortByName(roots);
};

// Drops inactive categories together with everything beneath them.
const pruneInactive = (tree) =>
  tree
    .filter((node) => node.isActive)
    .map((node) => ({ ...node, children: pruneInactive(node.children) }));

module.exports = { buildTree, pruneInactive };
