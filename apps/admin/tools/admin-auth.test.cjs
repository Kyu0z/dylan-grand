// Run from apps/admin: node --test tools/admin-auth.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dylan-admin-auth-'));
for (const name of ['api-client', 'api-messages', 'staff-access', 'domain']) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', `${name}.ts`), 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  fs.writeFileSync(path.join(dir, `${name}.js`), result.outputText);
}
const { request, ApiError } = require(path.join(dir, 'api-client.js'));
const { translateApiMessage } = require(path.join(dir, 'api-messages.js'));
const { canAccess, manageableRoles } = require(path.join(dir, 'staff-access.js'));
const translate = m => translateApiMessage(m, 'vi', x => x);
const base = 'https://test.example/api/v1';
const realFetch = globalThis.fetch;
const respond = (data, status, headers) => { globalThis.fetch = async () => new Response(JSON.stringify(data), { status, headers }); };
test('manager cannot create peer/admin; lower roles cannot navigate staff', () => {
  assert.deepEqual(manageableRoles('MANAGER'), ['RECEPTIONIST', 'HOUSEKEEPING']);
  assert.equal(manageableRoles('ADMIN').length, 4);
  assert.deepEqual(manageableRoles('RECEPTIONIST'), []);
  assert.equal(canAccess('ADMIN', '/staff'), true);
  assert.equal(canAccess('MANAGER', '/staff'), true);
  assert.equal(canAccess('RECEPTIONIST', '/staff'), false);
  assert.equal(canAccess('HOUSEKEEPING', '/staff'), false);
});
test('uses server success message header, sends bearer token and preserves data', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `${base}/admin/staff`);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(JSON.stringify({ id: 'u1' }), { status: 201, headers: { 'X-Dylan-Message': encodeURIComponent('Staff account created successfully.') } });
  };
  assert.deepEqual(await request(base, '/admin/staff', { method: 'POST', body: {}, token: 'test-token' }), { data: { id: 'u1' }, message: 'Staff account created successfully.' });
});
test('uses backend error message and preserves array validation errors', async () => {
  respond({ message: 'Insufficient role permissions.' }, 403);
  await assert.rejects(request(base, '/admin/staff'), e => e instanceof ApiError && e.status === 403 && e.message === 'Insufficient role permissions.');
  const messages = ['email must be an email', 'password must be longer than or equal to 12 characters'];
  respond({ message: messages }, 400);
  await assert.rejects(request(base, '/auth/staff/login'), e => e instanceof ApiError && JSON.stringify(e.messages) === JSON.stringify(messages));
});
test('retains backend warning when invitation delivery fails', async () => {
  respond({ id: 'u1', invitationSent: false, message: 'Staff account created. Invitation delivery failed. Please resend.' }, 201);
  const result = await request(base, '/admin/staff', { method: 'POST' });
  assert.equal(result.data.invitationSent, false);
  assert.equal(result.message, 'Staff account created. Invitation delivery failed. Please resend.');
  assert.match(translate(result.message), /thất bại/);
});
test('network failure and missing production API URL do not fall back to localhost', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(request(base, '/admin/staff'), e => e instanceof ApiError && e.status === 0);
  await assert.rejects(request('', '/admin/staff'), /API URL is not configured/);
});
test('translates staff auth and validation messages', () => {
  assert.equal(translate('Signed in successfully.'), 'Đăng nhập thành công.');
  assert.equal(translate('Account activated. Please sign in.'), 'Tài khoản đã được kích hoạt. Vui lòng đăng nhập.');
  assert.equal(translate('Password updated. Please sign in.'), 'Đã cập nhật mật khẩu. Vui lòng đăng nhập.');
  assert.equal(translate('Current password is incorrect.'), 'Mật khẩu hiện tại không đúng.');
  assert.equal(translate('currentPassword should not be empty'), 'Mật khẩu hiện tại không được để trống.');
  assert.equal(translateApiMessage('Invalid credentials.', 'en', x => x), 'Invalid credentials.');
});
test.after(() => { globalThis.fetch = realFetch; fs.rmSync(dir, { recursive: true, force: true }); });
