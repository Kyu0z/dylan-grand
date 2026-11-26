const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = (file) => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');

function loadFooter() {
  const { outputText } = ts.transpileModule(source('components/picker-footer.tsx'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const module = { exports: {} };
  // The footer is presentational; JSX objects are sufficient for this structural test.
  const jsx = (type, props) => ({ type, props });
  const requireRuntime = (name) => {
    assert.equal(name, 'react/jsx-runtime');
    return { jsx, jsxs: jsx };
  };
  new Function('require', 'module', 'exports', outputText)(
    requireRuntime,
    module,
    module.exports,
  );
  return module.exports.PickerFooter;
}

const PickerFooter = loadFooter();

test('date-time footer keeps shortcuts left and confirmation actions right', () => {
  const shortcuts = ['Clear', 'Today'];
  const actions = ['Cancel', 'Apply'];
  const footer = PickerFooter({ shortcuts, actions });
  const [left, right] = footer.props.children;
  assert.equal(left.props.className, 'picker-footer-shortcuts');
  assert.deepEqual(left.props.children, shortcuts);
  assert.equal(right.props.className, 'picker-footer-actions');
  assert.deepEqual(right.props.children, actions);
});

test('date-only footer has no empty confirmation group', () => {
  const [left, right] = PickerFooter({ shortcuts: ['Clear', 'Today'] }).props.children;
  assert.deepEqual(left.props.children, ['Clear', 'Today']);
  assert.equal(right, undefined);
});

function findArray(name) {
  const ast = ts.createSourceFile('business.tsx', source('pages/business.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found, `Missing ${name} array`);
  return found.elements.map((node) => {
    if (ts.isSpreadElement(node)) return node.expression.getText(ast);
    assert.ok(ts.isCallExpression(node) && ts.isStringLiteral(node.arguments[0]));
    return node.arguments[0].text;
  });
}

test('reservation dates remain together after guest and room information', () => {
  const fields = findArray('createFields');
  assert.deepEqual(fields, [
    'roomTypeCode',
    'adults',
    'children',
    'guestName',
    'guestEmail',
    'guestPhone',
    'dateFields()',
    'specialRequests',
    'ratePlan',
    'guaranteeMode',
    'promotionCode',
    'acceptedTerms',
  ]);
});
