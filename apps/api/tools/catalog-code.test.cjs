const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCatalogCode, promotionCode, createWithCode } = require('../dist/core/catalog-code.js');
const conflict = () => Object.assign(new Error('duplicate'), { code: 'P2002' });
test('normalizes room and service names, including Vietnamese diacritics', () => {
    assert.equal(normalizeCatalogCode(' Deluxe King Room ', 'room'), 'deluxe-king-room');
    assert.equal(normalizeCatalogCode('Đưa đón sân bay', 'service'), 'DUA_DON_SAN_BAY');
    assert.equal(normalizeCatalogCode('  !!! ', 'service'), 'SERVICE');
    assert.equal(normalizeCatalogCode('X', 'room'), 'room');
});
test('automatically retries database uniqueness conflicts and respects max length', async () => {
    const candidates = [];
    const base = 'a'.repeat(40);
    const result = await createWithCode({ base, conflictMessage: 'Duplicate', create: async (code) => {
            candidates.push(code);
            if (candidates.length < 3)
                throw conflict();
            return code;
        } });
    assert.equal(result, 'a'.repeat(38) + '-3');
    assert.equal(candidates.every((code) => code.length <= 40), true);
});
test('two concurrent creates get distinct codes using insert-level uniqueness', async () => {
    const existing = new Set();
    const create = async (code) => {
        if (existing.has(code))
            throw conflict();
        existing.add(code);
        return code;
    };
    const options = { base: 'BREAKFAST', separator: '_', create, conflictMessage: 'Duplicate' };
    assert.deepEqual(new Set(await Promise.all([createWithCode(options), createWithCode(options)])), new Set(['BREAKFAST', 'BREAKFAST_2']));
});
test('manual promotion code is not silently changed if duplicate', async () => {
    let attempts = 0;
    await assert.rejects(createWithCode({ explicit: 'WELCOME10', conflictMessage: 'Promotion code already exists.', create: async () => {
            attempts++;
            throw conflict();
        } }), /Promotion code already exists/);
    assert.equal(attempts, 1);
});
test('generated promotion format is valid and retries on duplicate', async () => {
    assert.match(promotionCode(), /^DG-[A-F0-9]{10}$/);
    let attempts = 0;
    const code = await createWithCode({ conflictMessage: 'Duplicate', create: async (value) => {
            if (++attempts === 1)
                throw conflict();
            return value;
        } });
    assert.match(code, /^DG-[A-F0-9]{10}$/);
    assert.equal(attempts, 2);
});
test('non-unique database errors propagate without retry', async () => {
    const error = Object.assign(new Error('Database unavailable'), { code: 'P1001' });
    let attempts = 0;
    await assert.rejects(createWithCode({ base: 'suite', conflictMessage: 'Duplicate', create: async () => {
            attempts++;
            throw error;
        } }), (actual) => actual === error);
    assert.equal(attempts, 1);
});
