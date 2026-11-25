// Run after building: node --test tools/customer-auth.test.cjs
// No live DB, mail service or credentials are used; all external effects are mocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AuthService } = require('../dist/core/auth.service');
const { issueResetToken, verifyResetToken, readResetToken, resetEmailConfig, sendResetEmail } = require('../dist/core/password-reset');

process.env.JWT_ACCESS_SECRET = 'test-only-secret-not-for-deployment-123456789';
process.env.GMAIL_CLIENT_ID = 'test-client';
process.env.GMAIL_CLIENT_SECRET = 'test-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh';
process.env.GMAIL_SENDER_EMAIL = 'sender@example.test';
process.env.CUSTOMER_RESET_URL = 'https://example.test/account';

function fixture() {
  const users = new Map();
  let next = 0;
  const db = {
    user: {
      findUnique: async ({ where }) => structuredClone([...users.values()].find(u => where.id ? u.id === where.id : u.email === where.email) ?? null),
      create: async ({ data, select }) => {
        const row = { id: `u${++next}`, role: 'CUSTOMER', isActive: true, pendingActivation: false, staffSessionVersion: 0, ...data, guestProfile: data.guestProfile?.create ?? null };
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
  const staff = await auth.register({ email: 'staff@example.test', password: 'OriginalPassword!42', fullName: 'Existing Admin' });
  users.get(staff.id).role = 'ADMIN';
  const old = await auth.login(user.email, 'OriginalPassword!42');
  const staffLogin = await auth.login(staff.email, 'OriginalPassword!42');
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'mock-access' });
    return Response.json({ id: 'mock-message' });
  };
  try {
    const known = await auth.forgotPassword(user.email, 'test-reset-ip', 'vi');
    assert.deepEqual(await auth.forgotPassword('missing@example.test', 'test-reset-ip'), known);
    assert.deepEqual(await auth.forgotPassword(staff.email, 'test-reset-ip'), known);
    assert.deepEqual(await auth.forgotPassword(user.email, 'test-reset-ip'), known);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
    assert.equal(calls[0].options.body.get('grant_type'), 'refresh_token');
    assert.equal(calls[0].options.body.get('refresh_token'), 'test-refresh');
    assert.equal(calls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    assert.equal(calls[1].options.headers.Authorization, 'Bearer mock-access');
    const { headers, text } = decodeMime(calls[1].options.body);
    assert.match(headers, /From: Dylan Grand Hotel <sender@example.test>/);
    assert.match(headers, /To: <reset@example.test>/);
    assert.match(decodeSubject(headers), /Đặt lại mật khẩu/);
    const link = text.match(/https:\/\/\S+/)[0];
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

function decodeMime(body) {
  const raw = Buffer.from(JSON.parse(body).raw, 'base64url').toString('utf8');
  const [headers, encoded] = raw.split('\r\n\r\n');
  return { headers, text: Buffer.from(encoded, 'base64').toString('utf8') };
}
function decodeSubject(headers) {
  const encoded = headers.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
  return Buffer.from(encoded, 'base64').toString('utf8');
}

test('Gmail sends to different recipients and uses the correct language and link', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (url.includes('oauth2.googleapis.com')) return Response.json({ access_token: 'mock-access' });
    calls.push(decodeMime(options.body));
    return Response.json({ id: 'mock' });
  };
  try {
    const config = resetEmailConfig();
    await sendResetEmail(config, 'first@gmail.com', 'token-one', 'en');
    await sendResetEmail(config, 'second@outlook.com', 'token-two', 'vi');
    assert.equal(calls.length, 2);
    assert.match(calls[0].headers, /To: <first@gmail.com>/);
    assert.match(calls[1].headers, /To: <second@outlook.com>/);
    assert.match(decodeSubject(calls[0].headers), /Reset your password/);
    assert.match(decodeSubject(calls[1].headers), /Đặt lại mật khẩu/);
    assert.match(calls[0].text, /https:\/\/example.test\/account#resetToken=token-one/);
    assert.match(calls[1].text, /https:\/\/example.test\/account#resetToken=token-two/);
    await sendResetEmail(config, 'bad@example.com\r\nBcc: other@example.com', 'token', 'en');
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = original; }
});

test('OAuth and delivery failures remain private and do not trigger unsafe retries', async () => {
  const original = globalThis.fetch;
  const config = resetEmailConfig();
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return Response.json({ error: 'invalid_grant' }, { status: 400 }); };
    await sendResetEmail(config, 'first@gmail.com', 'token', 'en');
    assert.equal(calls, 1);
    globalThis.fetch = async (url) => {
      calls++;
      return url.includes('oauth2.googleapis.com') ? Response.json({ access_token: 'mock-access' }) : Response.json({}, { status: 403 });
    };
    await sendResetEmail(config, 'first@gmail.com', 'token', 'en');
    assert.equal(calls, 3);
  } finally { globalThis.fetch = original; }
});

test('Gmail configuration rejects missing secrets and invalid production reset URLs', () => {
  const keys = ['NODE_ENV', 'CUSTOMER_RESET_URL', 'GMAIL_REFRESH_TOKEN'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = 'production';
    process.env.CUSTOMER_RESET_URL = 'http://localhost:3000/account';
    assert.throws(() => resetEmailConfig(), /Password reset is temporarily unavailable/);
    process.env.CUSTOMER_RESET_URL = 'https://example.test/account';
    delete process.env.GMAIL_REFRESH_TOKEN;
    assert.throws(() => resetEmailConfig(), /Password reset is temporarily unavailable/);
    process.env.GMAIL_REFRESH_TOKEN = 'test-refresh';
    assert.equal(resetEmailConfig().url.href, 'https://example.test/account');
    process.env.NODE_ENV = 'development';
    process.env.CUSTOMER_RESET_URL = 'http://localhost:3000/account';
    assert.equal(resetEmailConfig().url.href, 'http://localhost:3000/account');
  } finally {
    for (const key of keys) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key];
  }
});
