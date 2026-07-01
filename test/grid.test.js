import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertionIndex } from '../src/lib/grid.js';

test('empty centers returns 0', () => {
  assert.equal(insertionIndex([], 10, 10), 0);
});

test('single tile: left of center inserts before, right inserts after', () => {
  const centers = [{ x: 50, y: 50 }];
  assert.equal(insertionIndex(centers, 40, 50), 0);
  assert.equal(insertionIndex(centers, 60, 50), 1);
});

test('row of tiles: inserts before/after the nearest by x', () => {
  const centers = [{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 250, y: 50 }];
  assert.equal(insertionIndex(centers, 30, 50), 0);   // before first
  assert.equal(insertionIndex(centers, 120, 50), 1);  // nearest 150, left of it
  assert.equal(insertionIndex(centers, 170, 50), 2);  // nearest 150, right of it
  assert.equal(insertionIndex(centers, 260, 50), 3);  // after last
});

test('wrapping grid: nearest center picks the right row', () => {
  const centers = [
    { x: 50, y: 50 }, { x: 150, y: 50 },
    { x: 50, y: 150 }, { x: 150, y: 150 },
  ];
  assert.equal(insertionIndex(centers, 140, 150), 3); // nearest bottom-right, left of it
  assert.equal(insertionIndex(centers, 160, 150), 4); // nearest bottom-right, right of it
});
