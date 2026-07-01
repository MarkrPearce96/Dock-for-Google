import { test } from 'node:test';
import assert from 'node:assert/strict';
import { host, resolveIcon } from '../src/lib/icons.js';

test('host extracts hostname', () => {
  assert.equal(host('https://mail.google.com/mail'), 'mail.google.com');
});

test('host returns empty string on malformed url', () => {
  assert.equal(host('not a url'), '');
});

test('resolveIcon prefers a custom iconUrl', () => {
  const app = { url: 'https://x.com', iconUrl: 'https://cdn/x.png' };
  assert.equal(resolveIcon(app), 'https://cdn/x.png');
});

test('resolveIcon falls back to favicon service using host', () => {
  const app = { url: 'https://mail.google.com' };
  assert.equal(
    resolveIcon(app),
    'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'
  );
});

test('resolveIcon ignores empty-string iconUrl', () => {
  const app = { url: 'https://mail.google.com', iconUrl: '' };
  assert.equal(
    resolveIcon(app),
    'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'
  );
});
