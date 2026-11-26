const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const file = path.join(__dirname, '../src/lib/date-picker.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = { exports: {} };
new Function('module', 'exports', compiled.outputText)(loaded, loaded.exports);
const { hotelNow, validPickerValue, displayPickerValue, nextPickerValue, calendarCells, parseCalendarDate, calendarIso, popupPosition, pickerValueInRange } = loaded.exports;
test('uses DD/MM/YYYY and 24-hour time independently of language', () => {
    assert.equal(displayPickerValue('2026-11-26', false), '26/11/2026');
    assert.equal(displayPickerValue('2026-11-26T14:00', true), '26/11/2026 · 14:00');
});
test('uses hotel time even when the UTC date is different', () => {
    assert.equal(hotelNow(new Date('2026-11-25T18:30:00Z')), '2026-11-26T01:30');
    assert.equal(hotelNow(new Date('2026-11-25T17:00:00Z')), '2026-11-26T00:00');
});
test('rejects invalid dates and time without rollover', () => {
    assert.equal(validPickerValue('2026-02-29', false), false);
    assert.equal(validPickerValue('2028-02-29', false), true);
    assert.equal(validPickerValue('2026-11-26T24:00', true), false);
    assert.equal(validPickerValue('2026-11-26T12:60', true), false);
});
test('exclusive end date and end time cross month and year boundaries', () => {
    assert.equal(nextPickerValue('2026-11-30', false), '2026-12-01');
    assert.equal(nextPickerValue('2026-12-31T23:59', true), '2027-01-01T00:00');
    assert.equal(nextPickerValue('', false), undefined);
    assert.equal(pickerValueInRange('2026-11-26', '2026-11-27'), false);
});
test('calendar contains 42 consecutive cells including adjacent months', () => {
    const cells = calendarCells(parseCalendarDate('2026-11-26'));
    assert.equal(cells.length, 42);
    assert.equal(calendarIso(cells[0]), '2026-11-01');
    assert.equal(calendarIso(cells[41]), '2026-12-12');
});
test('popup opens below, flips above, and clamps to viewport edge', () => {
    assert.deepEqual(popupPosition({ left: 100, top: 100, bottom: 145 }, 320, 300, 1024, 768), { left: 100, top: 153 });
    assert.deepEqual(popupPosition({ left: 900, top: 620, bottom: 664 }, 320, 300, 1024, 768), { left: 692, top: 312 });
    assert.deepEqual(popupPosition({ left: 5, top: 150, bottom: 194 }, 300, 500, 324, 524), { left: 12, top: 12 });
});
