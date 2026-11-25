// Run from apps/admin: node --test tools/image-upload.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/image-upload.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = { exports: {} };
new Function('module', 'exports', compiled.outputText)(loaded, loaded.exports);
const { validateImageFiles, moveImage, MAX_IMAGE_BYTES } = loaded.exports;

const image = (type = 'image/jpeg', size = 1024) => ({ type, size });

test('accepts JPEG, PNG and WebP and the exact 5 MB boundary', () => {
  assert.equal(validateImageFiles([image(), image('image/png'), image('image/webp', MAX_IMAGE_BYTES)], 0), null);
});

test('rejects unsupported image and non-image types', () => {
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', '']) {
    assert.equal(validateImageFiles([image(type)], 0), 'format');
  }
});

test('rejects zero-byte and oversized files', () => {
  for (const size of [0, MAX_IMAGE_BYTES + 1]) {
    assert.equal(validateImageFiles([image('image/png', size)], 0), 'size');
  }
});

test('counts existing photos and rejects batches exceeding 10', () => {
  assert.equal(validateImageFiles([image()], 9), null);
  assert.equal(validateImageFiles([image(), image()], 9), 'count');
  assert.equal(validateImageFiles([image()], 10), 'count');
});

test('single-image replacement accepts one file but rejects multiple', () => {
  assert.equal(validateImageFiles([image()], 0, 1), null);
  assert.equal(validateImageFiles([image(), image()], 0, 1), 'count');
});

test('reordering moves an image without modifying the original list', () => {
  const original = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveImage(original, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveImage(original, 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(original, ['a', 'b', 'c', 'd']);
});

test('invalid reorder indices preserve image order and count', () => {
  const original = ['a', 'b', 'c'];
  for (const [from, to] of [[-1, 0], [0, 3], [3, 0], [0, -1], [1.5, 2], [1, 1]]) {
    assert.deepEqual(moveImage(original, from, to), original);
  }
});

test('moving duplicate URLs retains the correct number of entries', () => {
  assert.deepEqual(moveImage(['a', 'a', 'b'], 2, 0), ['b', 'a', 'a']);
});
