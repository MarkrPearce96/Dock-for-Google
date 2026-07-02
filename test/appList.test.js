import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, addApp, updateApp, removeApp, moveApp, moveAppTo, addAppAt } from '../src/lib/appList.js';

test('makeApp generates id and trims fields', () => {
  const a = makeApp({ name: '  Gmail ', url: ' https://mail.google.com ' });
  assert.equal(a.name, 'Gmail');
  assert.equal(a.url, 'https://mail.google.com');
  assert.equal(typeof a.id, 'string');
  assert.ok(a.id.length > 0);
  assert.ok(!('iconUrl' in a));
});

test('makeApp keeps a non-empty iconUrl', () => {
  const a = makeApp({ name: 'X', url: 'https://x.com', iconUrl: 'https://i/x.png' });
  assert.equal(a.iconUrl, 'https://i/x.png');
});

test('addApp appends without mutating input', () => {
  const list = [];
  const next = addApp(list, { name: 'Gmail', url: 'https://mail.google.com' });
  assert.equal(list.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0].name, 'Gmail');
});

test('updateApp merges patch by id', () => {
  const list = addApp([], { name: 'Gmail', url: 'https://mail.google.com' });
  const id = list[0].id;
  const next = updateApp(list, id, { name: 'Mail' });
  assert.equal(next[0].name, 'Mail');
  assert.equal(next[0].url, 'https://mail.google.com');
});

test('updateApp removes iconUrl when patched empty', () => {
  let list = addApp([], { name: 'X', url: 'https://x.com', iconUrl: 'https://i/x.png' });
  const id = list[0].id;
  list = updateApp(list, id, { iconUrl: '  ' });
  assert.ok(!('iconUrl' in list[0]));
});

test('removeApp drops the matching app', () => {
  let list = addApp([], { name: 'Gmail', url: 'https://mail.google.com' });
  const id = list[0].id;
  list = removeApp(list, id);
  assert.equal(list.length, 0);
});

test('moveApp up swaps with previous neighbor', () => {
  let list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'B', url: 'https://b.com' });
  const idB = list[1].id;
  list = moveApp(list, idB, 'up');
  assert.deepEqual(list.map((a) => a.name), ['B', 'A']);
});

test('moveApp down at the end is a no-op', () => {
  let list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'B', url: 'https://b.com' });
  const idB = list[1].id;
  list = moveApp(list, idB, 'down');
  assert.deepEqual(list.map((a) => a.name), ['A', 'B']);
});

test('moveApp up at the start is a no-op', () => {
  let list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'B', url: 'https://b.com' });
  const idA = list[0].id;
  list = moveApp(list, idA, 'up');
  assert.deepEqual(list.map((a) => a.name), ['A', 'B']);
});

test('updateApp does not mutate the input list', () => {
  const list = addApp([], { name: 'Gmail', url: 'https://mail.google.com' });
  const id = list[0].id;
  const snapshot = JSON.stringify(list);
  updateApp(list, id, { name: 'Mail' });
  assert.equal(JSON.stringify(list), snapshot);
});

test('removeApp does not mutate the input list', () => {
  const list = addApp([], { name: 'Gmail', url: 'https://mail.google.com' });
  const id = list[0].id;
  const snapshot = JSON.stringify(list);
  removeApp(list, id);
  assert.equal(JSON.stringify(list), snapshot);
});

test('moveApp does not mutate the input list', () => {
  const list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'B', url: 'https://b.com' });
  const snapshot = JSON.stringify(list);
  moveApp(list, list[1].id, 'up');
  assert.equal(JSON.stringify(list), snapshot);
});

test('moveAppTo moves an item from start to a middle index', () => {
  let list = [];
  for (const n of ['A', 'B', 'C', 'D']) list = addApp(list, { name: n, url: `https://${n.toLowerCase()}.com` });
  const idA = list[0].id;
  list = moveAppTo(list, idA, 2);
  assert.deepEqual(list.map((a) => a.name), ['B', 'C', 'A', 'D']);
});

test('moveAppTo moves an item from end to start', () => {
  let list = [];
  for (const n of ['A', 'B', 'C']) list = addApp(list, { name: n, url: `https://${n.toLowerCase()}.com` });
  const idC = list[2].id;
  list = moveAppTo(list, idC, 0);
  assert.deepEqual(list.map((a) => a.name), ['C', 'A', 'B']);
});

test('moveAppTo clamps an out-of-range index to the ends', () => {
  let list = [];
  for (const n of ['A', 'B', 'C']) list = addApp(list, { name: n, url: `https://${n.toLowerCase()}.com` });
  const idA = list[0].id;
  const high = moveAppTo(list, idA, 99);
  assert.deepEqual(high.map((a) => a.name), ['B', 'C', 'A']);
  const idC = list[2].id;
  const low = moveAppTo(list, idC, -5);
  assert.deepEqual(low.map((a) => a.name), ['C', 'A', 'B']);
});

test('moveAppTo returns the list unchanged when id is not found', () => {
  const list = addApp([], { name: 'A', url: 'https://a.com' });
  const same = moveAppTo(list, 'nonexistent', 0);
  assert.deepEqual(same.map((a) => a.name), ['A']);
});

test('moveAppTo does not mutate the input list', () => {
  let list = [];
  for (const n of ['A', 'B', 'C']) list = addApp(list, { name: n, url: `https://${n.toLowerCase()}.com` });
  const snapshot = JSON.stringify(list);
  moveAppTo(list, list[0].id, 2);
  assert.equal(JSON.stringify(list), snapshot);
});

test('addAppAt inserts at the given index', () => {
  let list = addApp(addApp([], { name: 'A', url: 'https://a.com' }), { name: 'C', url: 'https://c.com' });
  list = addAppAt(list, { name: 'B', url: 'https://b.com' }, 1);
  assert.deepEqual(list.map((a) => a.name), ['A', 'B', 'C']);
});

test('addAppAt inserts at the start and end', () => {
  let list = addApp([], { name: 'B', url: 'https://b.com' });
  assert.deepEqual(addAppAt(list, { name: 'A', url: 'https://a.com' }, 0).map((a) => a.name), ['A', 'B']);
  assert.deepEqual(addAppAt(list, { name: 'C', url: 'https://c.com' }, 1).map((a) => a.name), ['B', 'C']);
});

test('addAppAt clamps an out-of-range index', () => {
  const list = addApp([], { name: 'A', url: 'https://a.com' });
  assert.deepEqual(addAppAt(list, { name: 'X', url: 'https://x.com' }, -5).map((a) => a.name), ['X', 'A']);
  assert.deepEqual(addAppAt(list, { name: 'Y', url: 'https://y.com' }, 99).map((a) => a.name), ['A', 'Y']);
});

test('addAppAt generates an id and does not mutate the input', () => {
  const list = addApp([], { name: 'A', url: 'https://a.com' });
  const snapshot = JSON.stringify(list);
  const next = addAppAt(list, { name: 'B', url: 'https://b.com' }, 0);
  assert.equal(typeof next[0].id, 'string');
  assert.ok(next[0].id.length > 0);
  assert.equal(JSON.stringify(list), snapshot);
});
