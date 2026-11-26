const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/field-placeholder.ts'), 'utf8');
const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const mod = { exports: {} };
new Function('module', 'exports', result.outputText)(mod, mod.exports);
const { fieldPlaceholder } = mod.exports;

test('preserves custom hints, including an explicitly empty placeholder', () => {
  assert.equal(fieldPlaceholder('en', 'text', 'Name', 'Custom hint'), 'Custom hint');
  assert.equal(fieldPlaceholder('vi', 'text', 'Tên', ''), '');
});
test('provides localized context for text, phone and email inputs', () => {
  assert.equal(fieldPlaceholder('en', 'text', 'Guest name'), 'Enter full name');
  assert.equal(fieldPlaceholder('vi', 'text', 'Tên khách'), 'Nhập họ và tên');
  assert.equal(fieldPlaceholder('vi', 'text', 'Điện thoại'), 'Nhập số điện thoại');
  assert.equal(fieldPlaceholder('en', 'email', 'Contact email'), 'name@example.com');
});
test('provides localized select hints without replacing a selected option', () => {
  assert.equal(fieldPlaceholder('en', 'select', 'Room type'), 'Select room type');
  assert.equal(fieldPlaceholder('vi', 'select', 'Hạng phòng'), 'Chọn hạng phòng');
  assert.equal(fieldPlaceholder('vi', 'select', undefined), 'Chọn giá trị');
});
test('keeps consistent date and datetime display formats', () => {
  for (const language of ['en', 'vi']) {
    assert.equal(fieldPlaceholder(language, 'date'), 'DD/MM/YYYY');
    assert.equal(fieldPlaceholder(language, 'datetime-local'), 'DD/MM/YYYY · HH:mm');
  }
});
test('uses context-specific examples and safe fallbacks for new forms', () => {
  assert.equal(fieldPlaceholder('vi', 'number', 'Số khách tối đa'), 'VD: 2');
  assert.equal(fieldPlaceholder('en', 'number', 'Discount (%)'), 'e.g. 10');
  assert.equal(fieldPlaceholder('en', 'text', 'Promotion code'), 'e.g. WELCOME10');
  assert.equal(fieldPlaceholder('vi', 'textarea', 'Lý do'), 'Nhập lý do');
  assert.equal(fieldPlaceholder('en', 'text', undefined), 'Enter a value');
});
