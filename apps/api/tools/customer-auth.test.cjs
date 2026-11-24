// Run after building: node --test tools/customer-auth.test.cjs
// No live DB, mail service or credentials are used; all external effects are mocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AuthService } = require('../dist/core/auth.service');
const { issueResetToken, verifyResetToken, readResetToken } = require('../dist/core/password-reset');

process.env.JWT_ACCESS_SECRET = 'test-only-secret-not-for-deployment-123456789';
process.env.RESEND_API_KEY = 'test-only';
process.env.RESET_EMAIL_FROM = 'Test <test@example.test>';
process.env.CUSTOMER_RESET_URL = 'https://example.test/account';

function fixture() {
  const users = new Map();
  let next = 0;
  const db = {
    user: {
      findUnique: async ({ where }) => structuredClone([...users.values()].find(u => where.id ? u.id === where.id : u.email === where.email) ?? null),
      create: async ({ data, select }) => {
        const row = { id: `u${++next}`, role: 'CUSTOMER', isActive: true, ...data, guestProfile: data.guestProfile?.create ?? null };
        users.set(row.id, row);
        return Object.fromEntries(Object.keys(select).map(key => [key, row[key]]));
      },
      updateMany: async ({ where, data }) => {
        const row = users.get(where.id);
        if (!row || row.passwordHash !== where.passwordHash || row.role !== where.role || !row.isActive) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  };
  return { auth: new AuthService(db), users };
}

test('register persists full name, rejects duplicate email and verifies customer login', async () => {
  const { auth, users } = fixture();
  const user = await auth.register({ email: 'AN@EXAMPLE.TEST', password: 'OriginalPassword!42', fullName: '  Nguyen Van An  ' });
  assert.equal(user.fullName, 'Nguyen Van An');
  assert.equal(user.email, 'an@example.test');
  assert.equal(user.passwordHash, undefined);
  assert.equal(users.get(user.id).guestProfile.name, 'Nguyen Van An');
  assert.notEqual(users.get(user.id).passwordHash, 'OriginalPassword!42');
  await assert.rejects(auth.register({ email: user.email, password: 'OriginalPassword!42', fullName: 'Another' }));
  await assert.rejects(auth.login(user.email, 'bad-password'));
  const login = await auth.login(user.email, 'OriginalPassword!42');
  assert.equal((await auth.verify(login.accessToken)).id, user.id);
  assert.equal((await auth.customerProfile(user.id)).fullName, 'Nguyen Van An');
});

test('email reset is generic, customer-only, single use and invalidates previous JWTs', async () => {
  const { auth, users } = fixture();
  const user = await auth.register({ email: 'reset@example.test', password: 'OriginalPassword!42', fullName: 'Test User' });
  const staff = await auth.createStaff({ email: 'staff@example.test', password: 'OriginalPassword!42', role: 'ADMIN' });
  const old = await auth.login(user.email, 'OriginalPassword!42');
  const staffLogin = await auth.login(staff.email, 'OriginalPassword!42');
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response('{}', { status: 200 }); };
  try {
    const known = await auth.forgotPassword(user.email, 'test-reset-ip', 'vi');
    assert.deepEqual(await auth.forgotPassword('missing@example.test', 'test-reset-ip'), known);
    assert.deepEqual(await auth.forgotPassword(staff.email, 'test-reset-ip'), known);
    assert.deepEqual(await auth.forgotPassword(user.email, 'test-reset-ip'), known);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.match(calls[0].body.subject, /Đặt lại mật khẩu/);
    const link = calls[0].body.text.match(/https:\/\/\S+/)[0];
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get('resetToken');
    assert.ok(token);
    await assert.rejects(auth.resetPassword(token.slice(0, -4) + 'AAAA', 'NewPassword!123', 'test-reset-ip'));
    const results = await Promise.allSettled([
      auth.resetPassword(token, 'NewPassword!123', 'test-reset-ip'),
      auth.resetPassword(token, 'NewPassword!123', 'test-reset-ip'),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    await assert.rejects(auth.resetPassword(token, 'NewPassword!456', 'test-reset-ip'));
    await assert.rejects(auth.verify(old.accessToken));
    await assert.rejects(auth.login(user.email, 'OriginalPassword!42'));
    const fresh = await auth.login(user.email, 'NewPassword!123');
    assert.equal((await auth.verify(fresh.accessToken)).id, user.id);
    assert.equal((await auth.verify(staffLogin.accessToken)).id, staff.id);
    const staffToken = issueResetToken(staff.id, users.get(staff.id).passwordHash, process.env.JWT_ACCESS_SECRET);
    await assert.rejects(auth.resetPassword(staffToken, 'NewPassword!123', 'test-reset-ip'));
  } finally { globalThis.fetch = realFetch; }
});

test('reset tokens reject different passwords, wrong secret, malformed and expired tokens', () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  const token = issueResetToken('test-user', 'hash-one', secret);
  assert.equal(verifyResetToken(token, 'hash-one', secret), true);
  assert.equal(verifyResetToken(token, 'hash-two', secret), false);
  assert.equal(verifyResetToken(token, 'hash-one', 'different-secret'), false);
  assert.equal(readResetToken('invalid'), null);
  const originalNow = Date.now;
  try {
    const current = originalNow();
    Date.now = () => current + 21 * 60_000;
    assert.equal(readResetToken(token), null);
    assert.equal(verifyResetToken(token, 'hash-one', secret), false);
  } finally { Date.now = originalNow; }
});
