// Run after building API. Google cryptography and Prisma are mocked; no external requests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');
const { AuthService } = require('../dist/core/auth.service');
const { issueResetToken } = require('../dist/core/password-reset');

process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
process.env.JWT_ACCESS_SECRET = 'test-only-google-auth-secret-not-for-production';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
const origin = 'http://localhost:3000';

function fixture() {
  const users = new Map();
  const challenges = new Map();
  let next = 0;
  const db = {
    googleAuthChallenge: {
      create: async ({ data }) => { challenges.set(data.nonce, data); return data; },
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const [key, row] of challenges) {
          if (where.nonce && (key !== where.nonce || row.origin !== where.origin)) continue;
          if (where.expiresAt.gt && row.expiresAt <= where.expiresAt.gt) continue;
          if (where.expiresAt.lte && row.expiresAt > where.expiresAt.lte) continue;
          challenges.delete(key);
          count++;
        }
        return { count };
      },
    },
    user: {
      findUnique: async ({ where }) => structuredClone([...users.values()].find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null),
      create: async ({ data, select }) => {
        if ([...users.values()].some(row => row.email === data.email || (data.googleId && row.googleId === data.googleId))) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        const row = { id: `u${++next}`, role: 'CUSTOMER', isActive: true, pendingActivation: false, staffSessionVersion: 0, googleId: null, avatarUrl: null, hasLocalPassword: true, ...data, guestProfile: data.guestProfile?.create ?? null };
        users.set(row.id, row);
        return select ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : structuredClone(row);
      },
      updateMany: async ({ where, data }) => {
        const row = users.get(where.id);
        if (!row || !Object.entries(where).every(([key, value]) => row[key] === value)) return { count: 0 };
        if (data.googleId && [...users.values()].some(other => other.id !== row.id && other.googleId === data.googleId)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  };
  return { auth: new AuthService(db), users, challenges };
}

async function credential(t, auth, changes = {}) {
  const challenge = await auth.googleChallenge(origin, 'challenge-test');
  const payload = { sub: 'google-123', email: 'guest@gmail.com', email_verified: true, name: 'Guest Name', picture: 'https://example.test/avatar.png', nonce: challenge.nonce, ...changes };
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async options => {
    assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID);
    assert.equal(options.idToken, 'mock-token');
    return { getPayload: () => payload };
  });
  return challenge.nonce;
}
const login = (auth, nonce) => auth.googleLogin('mock-token', nonce, origin, 'google-test');
const password = 'LocalPassword!2026';

test('new Google user gets customer JWT, guest profile and no local password; replay rejected', async t => {
  const { auth, users } = fixture();
  const nonce = await credential(t, auth);
  const result = await login(auth, nonce);
  assert.equal(result.role, 'CUSTOMER');
  const session = await auth.verify(result.accessToken);
  const user = users.get(session.id);
  assert.equal(user.googleId, 'google-123');
  assert.equal(user.hasLocalPassword, false);
  assert.equal(user.guestProfile.name, 'Guest Name');
  assert.equal((await auth.customerProfile(user.id)).googleLinked, true);
  await assert.rejects(login(auth, nonce), /expired/);
  await assert.rejects(auth.login(user.email, password), /Invalid credentials/);
});

test('existing password account requires explicit linking; original customer ID retained', async t => {
  const { auth, users } = fixture();
  const original = await auth.register({ email: 'guest@gmail.com', fullName: 'Existing Name', password });
  const nonce = await credential(t, auth);
  await assert.rejects(login(auth, nonce), error => error.getStatus() === 409 && error.message === 'Account already exists. Sign in with your password to link Google.');
  assert.equal(users.size, 1);
  assert.equal(users.get(original.id).googleId, null);
});

test('explicit link preserves profile and login with Google returns the same customer', async t => {
  const { auth, users } = fixture();
  const original = await auth.register({ email: 'guest@gmail.com', fullName: 'Existing Name', password });
  const nonce = await credential(t, auth);
  await auth.linkGoogle(original.id, 'mock-token', nonce, password, origin, 'link-test');
  assert.equal(users.get(original.id).googleId, 'google-123');
  assert.equal(users.get(original.id).guestProfile.name, 'Existing Name');
  assert.equal((await auth.login(original.email, password)).role, 'CUSTOMER');
  t.mock.restoreAll();
  const next = await credential(t, auth);
  const session = await auth.verify((await login(auth, next)).accessToken);
  assert.equal(session.id, original.id);
  assert.equal(users.size, 1);
});

test('wrong current password blocks linking', async t => {
  const { auth, users } = fixture();
  const original = await auth.register({ email: 'guest@gmail.com', fullName: 'Existing', password });
  const nonce = await credential(t, auth);
  await assert.rejects(auth.linkGoogle(original.id, 'mock-token', nonce, 'wrong', origin, 'link-test'), /Current password/);
  assert.equal(users.get(original.id).googleId, null);
});

test('different email cannot be linked', async t => {
  const { auth } = fixture();
  const original = await auth.register({ email: 'other@gmail.com', fullName: 'Existing', password });
  const nonce = await credential(t, auth);
  await assert.rejects(auth.linkGoogle(original.id, 'mock-token', nonce, password, origin, 'link-test'), /email must match/);
});

for (const role of ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING']) {
  test(`staff role ${role} is rejected`, async t => {
    const { auth, users } = fixture();
    const original = await auth.register({ email: 'guest@gmail.com', fullName: 'Staff', password });
    users.get(original.id).role = role;
    const nonce = await credential(t, auth);
    await assert.rejects(login(auth, nonce), /not available/);
  });
}

test('disabled linked customer is rejected', async t => {
  const { auth, users } = fixture();
  const original = await auth.register({ email: 'guest@gmail.com', fullName: 'Guest', password });
  Object.assign(users.get(original.id), { isActive: false, googleId: 'google-123' });
  await assert.rejects(login(auth, await credential(t, auth)), /not available/);
});

for (const [label, claims] of [['unverified email', { email_verified: false }], ['external email', { email: 'guest@example.org' }], ['wrong nonce', { nonce: 'bad' }]]) {
  test(`${label} is rejected`, async t => {
    const { auth, users } = fixture();
    await assert.rejects(login(auth, await credential(t, auth, claims)), /could not be verified/);
    assert.equal(users.size, 0);
  });
}

test('expired nonce and unapproved origin are rejected', async t => {
  const { auth, challenges } = fixture();
  const nonce = await credential(t, auth);
  challenges.get(nonce).expiresAt = new Date(0);
  await assert.rejects(login(auth, nonce), /expired/);
  await assert.rejects(auth.googleChallenge('https://evil.example', 'bad-origin'), /not allowed/);
});

test('verified Google-only customer can set a password via existing reset token', async t => {
  const { auth, users } = fixture();
  const result = await login(auth, await credential(t, auth));
  const session = await auth.verify(result.accessToken);
  const row = users.get(session.id);
  const token = issueResetToken(row.id, row.passwordHash, process.env.JWT_ACCESS_SECRET);
  await auth.resetPassword(token, password, 'reset-google');
  assert.equal(row.hasLocalPassword, true);
  assert.equal((await auth.login(row.email, password)).role, 'CUSTOMER');
  await assert.rejects(auth.verify(result.accessToken), /Expired or invalid/);
});

test('changed Google email does not silently change the hotel account', async t => {
  const { auth, users } = fixture();
  const original = await auth.register({ email: 'old@gmail.com', fullName: 'Guest', password });
  users.get(original.id).googleId = 'google-123';
  await assert.rejects(login(auth, await credential(t, auth)), /no longer matches/);
  assert.equal(users.get(original.id).email, 'old@gmail.com');
});

test('token rejected by Google verification never creates an account', async t => {
  const { auth, users } = fixture();
  const { nonce } = await auth.googleChallenge(origin, 'challenge-test');
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => { throw new Error('invalid signature or audience'); });
  await assert.rejects(login(auth, nonce), /Google sign-in failed/);
  assert.equal(users.size, 0);
});

test('concurrent reuse of the same nonce succeeds only once', async t => {
  const { auth, users } = fixture();
  const nonce = await credential(t, auth);
  const results = await Promise.allSettled([login(auth, nonce), login(auth, nonce)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(users.size, 1);
});

// Custom button uses authorization code + PKCE, then exactly the same ID-token and account checks.
const verifier = 'a'.repeat(64);
async function codeCredential(t, auth, changes = {}) {
  const nonce = await credential(t, auth, changes);
  t.mock.method(OAuth2Client.prototype, 'getToken', async options => {
    assert.equal(options.code, 'mock-code');
    assert.equal(options.codeVerifier, verifier);
    assert.equal(options.redirect_uri, `${origin}/account/google-callback`);
    return { tokens: { id_token: 'mock-token' } };
  });
  return nonce;
}
process.env.GOOGLE_CLIENT_SECRET = 'mock-secret';
const codeLogin = (auth, nonce) => auth.googleLogin('mock-code', nonce, origin, 'code-test', verifier);

test('authorization code exchanges server-side and creates customer; nonce replay fails', async t => {
  const { auth, users } = fixture();
  const nonce = await codeCredential(t, auth);
  const result = await codeLogin(auth, nonce);
  assert.equal(result.role, 'CUSTOMER');
  assert.equal(users.size, 1);
  await assert.rejects(codeLogin(auth, nonce), /expired/);
});

test('custom button preserves 409 and requires password to link', async t => {
  const { auth, users } = fixture();
  const original = await auth.register({ email: 'guest@gmail.com', fullName: 'Existing', password });
  const nonce = await codeCredential(t, auth);
  await assert.rejects(codeLogin(auth, nonce), error => error.getStatus() === 409 && error.message === 'Account already exists. Sign in with your password to link Google.');
  assert.equal(users.get(original.id).googleId, null);
  t.mock.restoreAll();
  const linkNonce = await codeCredential(t, auth);
  await auth.linkGoogle(original.id, 'mock-code', linkNonce, password, origin, 'link-test', verifier);
  assert.equal(users.get(original.id).googleId, 'google-123');
  t.mock.restoreAll();
  const next = await codeCredential(t, auth);
  const session = await auth.verify((await codeLogin(auth, next)).accessToken);
  assert.equal(session.id, original.id);
  assert.equal(users.size, 1);
});

test('code exchange without an ID token does not create an account', async t => {
  const { auth, users } = fixture();
  const { nonce } = await auth.googleChallenge(origin, 'challenge-test');
  t.mock.method(OAuth2Client.prototype, 'getToken', async () => ({ tokens: {} }));
  await assert.rejects(codeLogin(auth, nonce), /Google sign-in failed/);
  assert.equal(users.size, 0);
});

test('code exchange still rejects mismatched nonce', async t => {
  const { auth, users } = fixture();
  const nonce = await codeCredential(t, auth, { nonce: 'incorrect' });
  await assert.rejects(codeLogin(auth, nonce), /could not be verified/);
  assert.equal(users.size, 0);
});

test('missing server client secret returns 503 for code flow', async t => {
  const { auth } = fixture();
  const { nonce } = await auth.googleChallenge(origin, 'challenge-test');
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_SECRET;
  try {
    await assert.rejects(codeLogin(auth, nonce), error => error.getStatus() === 503);
  } finally {
    process.env.GOOGLE_CLIENT_SECRET = secret;
  }
});
