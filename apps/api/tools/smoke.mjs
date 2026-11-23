/**
 * Development-only API smoke test. Creates REAL rows in your development Neon DB.
 * Run after migration, bootstrap and login, with SMOKE_ENABLE_MUTATIONS=YES.
 * Does not test financial transfers, gateway webhooks, real-world cash receipt or refunds.
 */
const root = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
if (process.env.NODE_ENV === 'production' || process.env.SMOKE_ENABLE_MUTATIONS !== 'YES') {
  throw new Error('SMOKE_ENABLE_MUTATIONS=YES is required, and NODE_ENV must not be production.');
}
const email = process.env.SMOKE_ADMIN_EMAIL;
const password = process.env.SMOKE_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD (do not commit them).');

async function request(method, url, body, accessToken, expected = [200, 201]) {
  const response = await fetch(`${root}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!expected.includes(response.status)) throw new Error(`${method} ${url}: HTTP ${response.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}
function todayVN() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (t) => parts.find((x) => x.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function plusDays(date, n) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
const today = todayVN();
const tomorrow = plusDays(today, 1);
const suffix = Math.random().toString(36).slice(2, 9);
const code = `smoke-${suffix}`;
const number = `S${suffix}`;
const requestId = `booking-smoke-${suffix}`;

console.log('1/9 Health + login');
await request('GET', '/health/database', undefined, undefined);
await request('GET', '/admin/dashboard', undefined, undefined, [401]);
const login = await request('POST', '/auth/login', { email, password }, undefined);
const jwt = login.accessToken;
if (!jwt) throw new Error('Login response did not return accessToken.');

console.log('2/9 Create Room Type + Physical Room');
await request('POST', '/admin/room-types', { code, nameEn: `Smoke ${suffix}`, nameVi: `Test ${suffix}`, maxGuests: 2, baseRateVnd: 950000, isPublished: true }, jwt);
await request('POST', '/admin/physical-rooms', { number, floor: 1, roomTypeCode: code }, jwt);

console.log('3/9 Housekeeping transitions');
await request('PATCH', `/admin/housekeeping/rooms/${number}`, { status: 'CLEAN' }, jwt);
await request('PATCH', `/admin/housekeeping/rooms/${number}`, { status: 'INSPECTED' }, jwt);

console.log('4/9 Availability + atomic booking');
const query = `?checkIn=${today}&checkOut=${tomorrow}&adults=1`;
const before = await request('GET', `/availability${query}`);
if (before.roomTypes.find((r) => r.roomTypeCode === code)?.availableRooms !== 1) throw new Error('Expected 1 available room before booking.');
const bookingPayload = {
  clientRequestId: requestId, roomTypeCode: code, checkIn: today, checkOut: tomorrow, adults: 1,
  guestName: 'Smoke Test', guestEmail: 'smoke-test@example.test', ratePlan: 'FLEXIBLE',
  guaranteeMode: 'PAY_AT_HOTEL', acceptedTerms: true,
};
const booking = await request('POST', '/bookings', bookingPayload);
const replay = await request('POST', '/bookings', bookingPayload);
if (booking.code !== replay.code || booking.lookupToken !== replay.lookupToken) throw new Error('Booking idempotency failed.');
const after = await request('GET', `/availability${query}`);
if (after.roomTypes.find((r) => r.roomTypeCode === code)?.availableRooms !== 0) throw new Error('Expected 0 available rooms after booking.');

console.log('5/9 Private booking lookup + folio');
await request('GET', `/bookings/lookup?code=${booking.code}&lookupToken=${booking.lookupToken}`);
const folio = await request('GET', `/admin/payments/reservations/${booking.code}/folio`, undefined, jwt);
if (folio.balanceVnd !== 950000) throw new Error('Expected booked balance of 950000 VND.');

console.log('6/9 Record manual test receipt (development data only)');
const payment = { amountVnd: folio.balanceVnd, method: 'CASH', idempotencyKey: `smoke-payment-${suffix}`, note: 'Simulated dev smoke-test receipt — NOT an actual customer payment' };
await request('POST', `/admin/payments/reservations/${booking.code}/manual-payment`, payment, jwt);
await request('POST', `/admin/payments/reservations/${booking.code}/manual-payment`, payment, jwt);

console.log('7/9 Check-in, check-out and dirty room');
await request('POST', `/admin/front-desk/reservations/${booking.code}/check-in`, undefined, jwt);
await request('POST', `/admin/front-desk/reservations/${booking.code}/check-out`, undefined, jwt);
const house = await request('GET', '/admin/housekeeping', undefined, jwt);
if (house.find((r) => r.number === number)?.cleaningStatus !== 'DIRTY') throw new Error('Checkout must dirty the room.');

console.log('8/9 Review + reports');
await request('POST', `/bookings/${booking.code}/review`, { stars: 5, comment: 'Test completed stay — development data only.', lookupToken: booking.lookupToken });
await request('GET', `/admin/reports?from=${today}&to=${tomorrow}`, undefined, jwt);

console.log('9/9 Completed. Real dev DB rows created.');
console.log({ roomType: code, roomNumber: number, bookingCode: booking.code, status: 'CHECKED_OUT' });
