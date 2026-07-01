import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from '../src/lib/theme.js';

test('explicit light/dark resolve to themselves', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('light', false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('dark', true), 'dark');
});

test('system resolves from prefersDark', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});

test('unknown pref falls back to light', () => {
  assert.equal(resolveTheme('purple', true), 'light');
  assert.equal(resolveTheme(undefined, true), 'light');
});
