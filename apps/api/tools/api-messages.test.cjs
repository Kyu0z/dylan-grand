// Run after API build: node --test tools/api-messages.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException, ConflictException, UnauthorizedException } = require('@nestjs/common');
const { of, lastValueFrom } = require('rxjs');
const { API_MESSAGE_HEADER, ApiMessageInterceptor, errorPayload, successMessage } = require('../dist/common/http/api-messages');

test('success messages respect endpoint and existing business response', () => {
  assert.equal(successMessage('POST', '/api/v1/auth/login', { accessToken: 'token' }), 'Signed in successfully.');
  assert.equal(successMessage('POST', '/api/v1/auth/register/', { id: 'user' }), 'Account created successfully.');
  assert.equal(successMessage('PATCH', '/api/v1/me', {}), 'Profile updated successfully.');
  assert.equal(successMessage('POST', '/api/v1/admin/front-desk/reservations/ABC/check-in', {}), 'Check-in completed successfully.');
  assert.equal(successMessage('POST', '/api/v1/bookings/ABC/cancel', { message: 'Business detail' }), 'Business detail');
  assert.equal(successMessage('GET', '/api/v1/bookings', []), 'Data loaded successfully.');
});
test('interceptor sends header without wrapping or mutating arrays and response objects', async () => {
  const headers = {};
  const res = { statusCode: 201, headersSent: false, setHeader(key, value) { headers[key] = value; } };
  const context = { switchToHttp: () => ({ getRequest: () => ({ method: 'POST', path: '/api/v1/auth/register' }), getResponse: () => res }) };
  const body = { id: 'user', role: 'CUSTOMER' };
  const result = await lastValueFrom(new ApiMessageInterceptor().intercept(context, { handle: () => of(body) }));
  assert.equal(result, body);
  assert.equal(decodeURIComponent(headers[API_MESSAGE_HEADER]), 'Account created successfully.');
});
test('exception payload preserves actual business errors and all validation messages', () => {
  assert.equal(errorPayload(new ConflictException('Email already registered.')).message, 'Email already registered.');
  assert.equal(errorPayload(new UnauthorizedException('Invalid credentials.')).statusCode, 401);
  const errors = ['email must be an email', 'password must be longer than or equal to 12 characters'];
  assert.deepEqual(errorPayload(new BadRequestException(errors)).message, errors);
});
test('database errors are mapped and unknown internal errors do not disclose details', () => {
  assert.equal(errorPayload({ code: 'P2002', detail: 'private' }).statusCode, 409);
  assert.equal(errorPayload({ code: 'P2025' }).statusCode, 404);
  assert.equal(errorPayload({ code: 'P1001' }).statusCode, 503);
  const payload = errorPayload(new Error('postgres://private-secret'));
  assert.equal(payload.statusCode, 500);
  assert.doesNotMatch(JSON.stringify(payload), /private-secret/);
});
