const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTree, pruneInactive } = require('../../src/utils/categoryTree');

const cat = (id, name, parent = null, isActive = true) => ({ _id: id, name, parent, isActive });

test('buildTree nests categories to any depth', () => {
  const depth = 50;
  const list = [cat('c0', 'Level 0')];
  for (let i = 1; i < depth; i++) list.push(cat(`c${i}`, `Level ${i}`, `c${i - 1}`));

  let node = buildTree(list)[0];
  let levels = 1;
  while (node.children.length) {
    node = node.children[0];
    levels++;
  }
  assert.equal(levels, depth);
});

test('buildTree works regardless of input order and sorts siblings by name', () => {
  const list = [cat('3', 'Samsung', '2'), cat('1', 'Electronics'), cat('4', 'OnePlus', '2'), cat('2', 'Android', '1')];
  const tree = buildTree(list);
  assert.equal(tree.length, 1);
  assert.deepEqual(tree[0].children[0].children.map((c) => c.name), ['OnePlus', 'Samsung']);
});

test('buildTree returns several roots and does not mutate its input', () => {
  const list = [cat('1', 'Books'), cat('2', 'Electronics')];
  const tree = buildTree(list);
  assert.deepEqual(tree.map((n) => n.name), ['Books', 'Electronics']);
  assert.equal(list[0].children, undefined);
});

test('pruneInactive removes an inactive category together with its subtree', () => {
  const tree = buildTree([cat('1', 'A'), cat('2', 'B', '1', false), cat('3', 'C', '2'), cat('4', 'D', '1')]);
  const pruned = pruneInactive(tree);
  assert.deepEqual(pruned[0].children.map((c) => c.name), ['D']);
});
