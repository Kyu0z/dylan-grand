const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = (file) => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
const L = (en, vi) => ({ en, vi });

function load(file, dependencies) {
  const { outputText, diagnostics } = ts.transpileModule(source(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  assert.equal(diagnostics.length, 0);
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
      return dependencies[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}

const jsx = (type, props) => ({ type, props });

function render(target, language) {
  const { DeleteConfirmation } = load('components/delete-confirmation.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../lib/domain': { L },
    '../lib/locale': { useLocale: () => ({ t: (value) => typeof value === 'string' ? value : value[language] }) },
    './delete-confirmation.css': {},
  });
  return DeleteConfirmation({ target });
}

function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node === 'string') return node;
  return text(node.props.children);
}

test('English confirmation is one sentence with a bold target', () => {
  const result = render('Breakfast', 'en');
  assert.equal(text(result), 'Are you sure you want to delete “Breakfast”?');
  const strong = result.props.children.find((child) => child.type === 'strong');
  assert.equal(text(strong), '“Breakfast”');
});

test('Vietnamese confirmation uses the localized target', () => {
  const result = render(L('Breakfast', 'Bữa sáng'), 'vi');
  assert.equal(text(result), 'Bạn có chắc chắn muốn xóa “Bữa sáng”?');
});

test('promotion codes and future room identifiers work without changing the template', () => {
  for (const target of ['WELCOME10', '201', 'Grand Suite']) {
    assert.equal(text(render(target, 'en')), `Are you sure you want to delete “${target}”?`);
    assert.equal(text(render(target, 'vi')), `Bạn có chắc chắn muốn xóa “${target}”?`);
  }
});

test('target remains plain React text, not injected HTML', () => {
  const target = '<img src=x onerror=alert(1)>';
  const result = render(target, 'en');
  const strong = result.props.children.find((child) => child.type === 'strong');
  assert.equal(text(strong), `“${target}”`);
  assert.ok(!Object.hasOwn(strong.props, 'dangerouslySetInnerHTML'));
});

test('shared delete action keeps the existing async handler and destructive controls', async () => {
  const { createDeleteAction } = load('pages/business-ui.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {},
    '../lib/date-picker': {},
    '../components/ui': {},
    '../components/image-upload': {},
    '../components/delete-confirmation': {},
    '../lib/admin-auth': {},
    '../lib/domain': { L },
    '../lib/locale': {},
  });
  let calls = 0;
  const run = async () => { calls += 1; throw new Error('Conflict'); };
  const title = L('Delete room type', 'Xóa hạng phòng');
  const action = createDeleteAction({ title, target: 'Grand Suite', run });
  assert.equal(action.title, title);
  assert.equal(action.deleteTarget, 'Grand Suite');
  assert.deepEqual(action.fields, []);
  assert.deepEqual(action.confirmLabel, L('Delete', 'Xóa'));
  assert.equal(action.danger, true);
  assert.equal(calls, 0);
  await assert.rejects(action.run({}, 'request-id'), /Conflict/);
  assert.equal(calls, 1);
});
