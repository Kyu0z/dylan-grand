const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const result = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputText)(mod, mod.exports);
  return mod.exports;
}

const { formatMoneyDraft, normalizeMoneyDraft, validMoneyPaste, moneyCaret, numericDraftValid } = load('money-input.ts');
const { mergePricingRates } = load('pricing-table.ts');

test('formats VND with periods in both locales, without rounding', () => {
  for (const [raw, expected] of [['', ''], ['0', '0'], ['1000000', '1.000.000'], ['10000000', '10.000.000'], ['-1000000', '-1.000.000'], ['2000000000', '2.000.000.000']]) {
    assert.equal(formatMoneyDraft(raw), expected);
  }
});
test('raw draft remains unformatted, including zero, blank and signed adjustments', () => {
  assert.equal(normalizeMoneyDraft('3.000.000'), '3000000');
  assert.equal(normalizeMoneyDraft('000123'), '123');
  assert.equal(normalizeMoneyDraft(''), '');
  assert.equal(normalizeMoneyDraft('-'), null);
  assert.equal(normalizeMoneyDraft('-', true), '-');
  assert.equal(normalizeMoneyDraft('-1.000.000', true), '-1000000');
  assert.equal(normalizeMoneyDraft('1e6'), null);
});
test('accepts valid pasted integer amounts and rejects malformed, decimal or signed positive-only amounts', () => {
  for (const value of ['0', '1000000', '1.000.000']) assert.equal(validMoneyPaste(value), true);
  for (const value of ['1.5', '1,000', 'abc', '-1000', '1..000']) assert.equal(validMoneyPaste(value), false);
  assert.equal(validMoneyPaste('-1.000.000', true), true);
});
test('money validation preserves safe integer, negative adjustment and zero rules', () => {
  assert.equal(numericDraftValid('3000000', 1, 2000000000), true);
  assert.equal(numericDraftValid('0', 0, 2000000000), true);
  assert.equal(numericDraftValid('0', 1, 2000000000), false);
  assert.equal(numericDraftValid('-500000', -2000000000, 2000000000), true);
  for (const value of ['-', '2000000001', '1.5', '1e6', '3.000.000', '9007199254740993']) assert.equal(numericDraftValid(value, -2000000000, 2000000000), false);
});
test('caret remains at the logical digit, including negative amounts', () => {
  assert.equal(moneyCaret('1.234.567', 1), 1);
  assert.equal(moneyCaret('1.234.567', 2), 3);
  assert.equal(moneyCaret('1.234.567', 7), 9);
  assert.equal(moneyCaret('-1.234', 2), 2);
  assert.equal(moneyCaret('0', 0), 0);
});
test('merges legacy overrides and periods into one sorted list without duplicates or mutation', () => {
  const special = [{ id: 's', startDate: '2026-12-05', endDate: '2026-12-06', amountVnd: 1500000 }];
  const daily = [{ id: 'd', date: '2026-11-30', amountVnd: 3000000, periodId: null, roomType: { code: 'deluxe' } }, { id: 'linked', periodId: 's' }];
  const roomTypes = [{ code: 'deluxe', nameVi: 'Phòng Deluxe King' }];
  const snapshot = JSON.stringify({ special, daily });
  const result = mergePricingRates(special, daily, roomTypes);
  assert.deepEqual(result.map(r => r.id), ['d', 's']);
  assert.equal(result[0].startDate, result[0].endDate);
  assert.equal(result[0].amountVnd, 3000000);
  assert.equal(result[0].dailyRates[0].roomType.nameVi, 'Phòng Deluxe King');
  assert.equal(result[0].legacyDaily, true);
  assert.equal(JSON.stringify({ special, daily }), snapshot);
  assert.deepEqual(mergePricingRates([], [], []), []);
});
