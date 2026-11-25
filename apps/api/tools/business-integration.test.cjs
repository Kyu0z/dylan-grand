const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BookingService } = require('../dist/core/booking.service.js');
const { HotelService } = require('../dist/core/hotel.service.js');
const { FinanceService } = require('../dist/core/finance.service.js');
const { hotelToday, day, sha } = require('../dist/core/util.js');

function offset(n) {
  return new Date(day(hotelToday()).valueOf() + n * 86400000).toISOString().slice(0, 10);
}

function quoteFixture(overrides = {}) {
  const type = { id: 't1', isPublished: true, maxGuests: 3, baseRateVnd: 1000000, ...overrides.type };
  const db = {
    roomType: { findUnique: async () => type },
    extraService: { findUnique: async () => ({ id: 's1', isActive: true, priceVnd: 100000, ...overrides.service }) },
    promotion: { findUnique: async () => ({ id: 'p1', isActive: true, usageCount: 0, usageLimit: 10, startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 60000), discountPercent: 10, ...overrides.promo }) },
    ...overrides.db,
  };
  const hotel = { freeRooms: async () => overrides.free ?? [{ id: 'r1' }], quote: async () => ({ totalVnd: 2000000, lines: [{ date: offset(1), amountVnd: 1000000 }, { date: offset(2), amountVnd: 1000000 }] }) };
  const service = new BookingService(db, hotel);
  const dto = { roomTypeCode: 'deluxe', checkIn: offset(1), checkOut: offset(3), adults: 2, children: 1, ratePlan: 'FLEXIBLE', promotionCode: 'WELCOME10', extras: [{ serviceCode: 'BREAKFAST', quantity: 2 }] };
  return { db, hotel, service, dto };
}

test('server quote calculates room, promotion and extra service totals', async () => {
  const { service, dto } = quoteFixture();
  assert.deepEqual(await service.quoteBooking(dto), { roomTotalVnd: 2000000, discountVnd: 200000, extraTotalVnd: 200000, totalVnd: 2000000, nights: 2, availableRooms: 1 });
});

test('children count toward maximum room capacity', async () => {
  const { service, dto } = quoteFixture();
  await assert.rejects(service.quoteBooking({ ...dto, children: 2 }), /maximum occupancy/);
});

test('no continuously available room means no quote', async () => {
  const { service, dto } = quoteFixture({ free: [] });
  await assert.rejects(service.quoteBooking(dto), /No continuously available/);
});

test('unpublished room cannot be quoted', async () => {
  const { service, dto } = quoteFixture({ type: { isPublished: false } });
  await assert.rejects(service.quoteBooking(dto), /unavailable/);
});

test('duplicate service lines and inactive services are rejected', async () => {
  const { service, dto } = quoteFixture();
  await assert.rejects(service.quoteBooking({ ...dto, extras: [...dto.extras, ...dto.extras] }), /Duplicate extra service/);
  await assert.rejects(quoteFixture({ service: { isActive: false } }).service.quoteBooking(dto), /Service unavailable/);
});

test('exhausted and expired promotions are rejected', async () => {
  const { dto } = quoteFixture();
  await assert.rejects(quoteFixture({ promo: { usageCount: 10 } }).service.quoteBooking(dto), /Promotion is invalid/);
  await assert.rejects(quoteFixture({ promo: { endsAt: new Date(0) } }).service.quoteBooking(dto), /Promotion is invalid/);
});

test('changed quote is rejected before reservation or guest creation', async () => {
  process.env.JWT_ACCESS_SECRET ||= 'test-only-secret-not-a-production-credential';
  const { db, service, dto } = quoteFixture();
  let created = false;
  db.booking = { findUnique: async () => null, create: async () => { created = true; } };
  db.$transaction = async fn => fn(db);
  db.$queryRaw = async () => [];
  db.promotion.update = async () => {};
  await assert.rejects(service.create({ ...dto, guestName: 'Guest', guestEmail: 'guest@example.test', acceptedTerms: true, clientRequestId: 'test-request-001', expectedTotalVnd: 1 }), /Price changed/);
  assert.equal(created, false);
});

test('availability includes overdue checked-in physical room exclusion', async () => {
  let filter;
  const db = { physicalRoom: { findMany: async args => { filter = args.where; return []; } } };
  await new HotelService(db).freeRooms(db, 'type', day(offset(1)), day(offset(2)));
  assert.ok(filter.bookings.none.OR.some(item => item.status === 'CHECKED_IN' && item.checkOut.lte instanceof Date));
  assert.ok(filter.blocks.none.startDate.lt instanceof Date);
});

function checkoutFixture({ pending = 0, payment = 1000000, status = 'CHECKED_IN' } = {}) {
  const booking = { id: 'b1', code: 'DGH-TEST', roomId: 'r1', totalVnd: 1000000, status };
  let dirty = false;
  let completed = false;
  const db = {
    booking: { findUnique: async () => booking, findUniqueOrThrow: async () => booking, updateMany: async () => { completed = true; return { count: 1 }; } },
    serviceOrder: { count: async () => pending },
    paymentTransaction: { findMany: async () => [{ kind: 'PAYMENT', amountVnd: payment }] },
    physicalRoom: { update: async args => { dirty = args.data.cleaningStatus === 'DIRTY'; } },
    auditLog: { create: async () => {} },
    $queryRaw: async () => [],
    $transaction: async fn => fn(db),
  };
  return { service: new BookingService(db, {}), state: () => ({ dirty, completed }) };
}

test('checkout blocks incomplete services and unpaid or overpaid folio', async () => {
  for (const fixture of [checkoutFixture({ pending: 1 }), checkoutFixture({ payment: 1 }), checkoutFixture({ payment: 1100000 })]) {
    await assert.rejects(fixture.service.checkOut('DGH-TEST', 'staff'), /pending service|Outstanding folio/);
    assert.deepEqual(fixture.state(), { dirty: false, completed: false });
  }
});

test('settled checkout marks room dirty and completes stay', async () => {
  const fixture = checkoutFixture();
  const result = await fixture.service.checkOut('DGH-TEST', 'staff');
  assert.equal(result.status, 'CHECKED_OUT');
  assert.deepEqual(fixture.state(), { dirty: true, completed: true });
});

test('private lookup excludes internal fields and payment references', async () => {
  const token = 'test-private-lookup-token';
  const db = { booking: { updateMany: async () => {}, findUnique: async () => ({ code: 'DGH-TEST', lookupTokenHash: sha(token), payloadHash: 'internal', clientRequestId: 'private', status: 'CONFIRMED', totalVnd: 100, guest: { name: 'Guest', email: 'guest@example.test', notes: 'internal' }, payments: [{ kind: 'PAYMENT', amountVnd: 50, reference: 'bank-private' }], roomType: { code: 'deluxe' } }) } };
  const service = new BookingService(db, {});
  await assert.rejects(service.lookup('DGH-TEST', 'incorrect'), /Booking not found/);
  const value = await service.lookup('DGH-TEST', token);
  assert.equal(value.balanceVnd, 50);
  for (const key of ['lookupTokenHash', 'payloadHash', 'clientRequestId', 'payments']) assert.equal(key in value, false);
  assert.equal('notes' in value.guest, false);
});

test('refund cannot exceed actual overpayment', async () => {
  const booking = { id: 'b1', status: 'CANCELLED', cancelFeeVnd: 100, totalVnd: 1000 };
  const db = { booking: { findUnique: async () => booking, findUniqueOrThrow: async () => booking }, paymentTransaction: { findUnique: async () => null, findMany: async () => [{ kind: 'PAYMENT', amountVnd: 300 }] }, $queryRaw: async () => [], $transaction: async fn => fn(db) };
  await assert.rejects(new FinanceService(db).recordRefund('DGH-TEST', { amountVnd: 201, method: 'CASH', externallyCompleted: true, idempotencyKey: 'test-refund-001' }, 'staff'), /Refund exceeds/);
});
