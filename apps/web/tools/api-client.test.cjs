// Run from apps/web: node --test tools/api-client.test.cjs
// Uses the workspace TypeScript compiler; no external service or credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dylan-api-client-'));
for (const name of ['toast', 'api-client', 'api-messages', 'translations']) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', `${name}.ts`), 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  fs.writeFileSync(path.join(dir, `${name}.js`), result.outputText);
}
const { apiRequest, ApiError } = require(path.join(dir, 'api-client.js'));
const { translateApiMessage } = require(path.join(dir, 'api-messages.js'));
const { vietnamese } = require(path.join(dir, 'translations.js'));
const translate = message => translateApiMessage(message, 'vi', value => vietnamese[value] || value);
const realFetch = globalThis.fetch;
const events = [];
globalThis.window = new EventTarget();
window.addEventListener('dylan-toast', event => events.push(event.detail));
const respond = (body, status, headers) => { globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers }); };

test('uses server success header; keeps data unwrapped and sends one toast', async () => {
  events.length = 0;
  respond({ id: 'u1' }, 201, { 'X-Dylan-Message': encodeURIComponent('Account created successfully.') });
  const result = await apiRequest('/auth/register', { method: 'POST', body: {} });
  assert.deepEqual(result, { data: { id: 'u1' }, messages: ['Account created successfully.'] });
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'success');
});
test('uses real error message instead of replacing by status; preserves validation array', async () => {
  events.length = 0;
  respond({ message: 'Email already registered.' }, 409);
  await assert.rejects(apiRequest('/auth/register', { method: 'POST' }), e => e instanceof ApiError && e.message === 'Email already registered.');
  const messages = ['email must be an email', 'password must be longer than or equal to 12 characters'];
  respond({ message: messages }, 400);
  await assert.rejects(apiRequest('/auth/register', { method: 'POST' }), e => e instanceof ApiError && JSON.stringify(e.messages) === JSON.stringify(messages));
  assert.deepEqual(events[1], { kind: 'error', messages });
});
test('uses body message for password reset, and silent calls avoid duplicates', async () => {
  events.length = 0;
  respond({ message: 'Password updated. Please sign in.' }, 200);
  const result = await apiRequest('/auth/reset-password', { method: 'POST', notifications: 'none' });
  assert.deepEqual(result.messages, ['Password updated. Please sign in.']);
  assert.equal(events.length, 0);
});
test('GET avoids routine success noise, but network failure produces a toast', async () => {
  events.length = 0;
  respond([], 200);
  await apiRequest('/rooms');
  assert.equal(events.length, 0);
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(apiRequest('/rooms'), e => e instanceof ApiError && e.status === 0);
  assert.equal(events[0].messages[0], 'Unable to connect. Please try again.');
});
test('translates static, parameterized business and validation messages', () => {
  assert.equal(translate('Signed in successfully.'), 'Đăng nhập thành công.');
  assert.equal(translate('Email already registered.'), 'Email đã được đăng ký.');
  assert.equal(translate('password must be longer than or equal to 12 characters'), 'Mật khẩu phải có ít nhất 12 ký tự.');
  assert.equal(translate("Room type 'deluxe' does not exist."), "Loại phòng 'deluxe' không tồn tại.");
  assert.equal(translateApiMessage('Invalid credentials.', 'en', translate), 'Invalid credentials.');
});
test.after(() => { globalThis.fetch = realFetch; delete globalThis.window; fs.rmSync(dir, { recursive: true, force: true }); });
