import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, addApp, updateApp, removeApp, moveApp } from '../src/lib/appList.js';

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
