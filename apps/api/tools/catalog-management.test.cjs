const assert = require('node:assert/strict');
const { test } = require('node:test');
const { FinanceService } = require('../dist/core/finance.service.js');
const { promotionValues, serviceValues } = require('../dist/core/catalog-management.js');

const promo = {
  discountPercent: 15,
  startsAt: '2026-12-01T00:00:00Z',
  endsAt: '2026-12-31T00:00:00Z',
  usageLimit: 10,
  isActive: false,
};
const service = { name: 'Breakfast', unit: 'per guest', priceVnd: 280000 };

function fixture({ usageCount = 0, bookings = 0, orders = 0 } = {}) {
  const calls = [];
  const tx = {
    $queryRaw: async () => {},
    promotion: {
      findUnique: async () => ({ id: 'p1', code: 'WELCOME10', usageCount }),
      update: async args => {
        calls.push(['updatePromotion', args]);
        return { id: 'p1', ...args.data };
      },
      delete: async args => calls.push(['deletePromotion', args]),
    },
    booking: { count: async () => bookings },
    extraService: {
      findUnique: async () => ({ id: 's1', code: 'BREAKFAST', priceVnd: 250000 }),
      update: async args => {
        calls.push(['updateService', args]);
        return { id: 's1', ...args.data };
      },
      delete: async args => calls.push(['deleteService', args]),
    },
    serviceOrder: { count: async () => orders },
    auditLog: { create: async args => calls.push(['audit', args]) },
  };
  const db = { $transaction: async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return fn(tx);
  } };
  return { finance: new FinanceService(db), calls, tx };
}

test('promotion rejects reversed periods and limits below recorded usage', () => {
  assert.throws(() => promotionValues({ ...promo, endsAt: promo.startsAt }), /Invalid promotion period/);
  assert.throws(() => promotionValues(promo, 11), /Usage limit/);
  assert.equal(promotionValues(promo, 10).isActive, false);
});

test('promotion edit does not write code or usage count', async () => {
  const { finance, calls } = fixture({ usageCount: 3 });
  await finance.updatePromotion('WELCOME10', { ...promo, code: 'OTHER', usageCount: 0 }, 'admin');
  const data = calls[0][1].data;
  assert.equal(data.isActive, false);
  assert.equal(data.code, undefined);
  assert.equal(data.usageCount, undefined);
  assert.equal(calls[1][0], 'audit');
});

test('promotion delete protects both redemption count and booking references', async () => {
  for (const options of [{ usageCount: 1 }, { bookings: 1 }]) {
    const { finance, calls } = fixture(options);
    await assert.rejects(finance.deletePromotion('WELCOME10', 'admin'), /booking history/);
    assert.deepEqual(calls, []);
  }
});

test('unused promotion is hard-deleted with audit log', async () => {
  const { finance, calls } = fixture();
  assert.equal((await finance.deletePromotion('WELCOME10', 'admin')).message, 'Promotion deleted successfully.');
  assert.deepEqual(calls.map(call => call[0]), ['deletePromotion', 'audit']);
});

test('service edit can clear optional fields, deactivate, and change future price without changing code', async () => {
  const { finance, calls } = fixture({ orders: 2 });
  await finance.updateService('BREAKFAST', { ...service, nameVi: ' Bữa sáng ', descriptionEn: '', imageUrl: null, isActive: false, code: 'OTHER' }, 'admin');
  const data = calls[0][1].data;
  assert.equal(data.nameVi, 'Bữa sáng');
  assert.equal(data.descriptionEn, null);
  assert.equal(data.imageUrl, null);
  assert.equal(data.isActive, false);
  assert.equal(data.priceVnd, 280000);
  assert.equal(data.code, undefined);
  assert.deepEqual(calls.map(call => call[0]), ['updateService', 'audit']);
});

test('service delete rejects historical orders, even if not active', async () => {
  const { finance, calls } = fixture({ orders: 1 });
  await assert.rejects(finance.deleteService('BREAKFAST', 'admin'), /order history/);
  assert.deepEqual(calls, []);
});

test('unused service is hard-deleted and audited', async () => {
  const { finance, calls } = fixture();
  await finance.deleteService('BREAKFAST', 'admin');
  assert.deepEqual(calls.map(call => call[0]), ['deleteService', 'audit']);
});

test('missing record returns not found rather than an update or delete', async () => {
  const { finance, calls, tx } = fixture();
  tx.promotion.findUnique = async () => null;
  tx.extraService.findUnique = async () => null;
  await assert.rejects(finance.updatePromotion('missing', promo, 'admin'), /Promotion not found/);
  await assert.rejects(finance.deleteService('missing', 'admin'), /Service not found/);
  assert.deepEqual(calls, []);
});

test('image URL accepts only the configured Cloudinary image delivery origin', () => {
  const old = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  try {
    const url = 'https://res.cloudinary.com/test-cloud/image/upload/v1/dylan-grand/services/test.webp';
    assert.equal(serviceValues({ ...service, imageUrl: url }).imageUrl, url);
    for (const bad of ['https://example.org/image.webp', 'https://res.cloudinary.com/other/image/upload/test.jpg', 'http://res.cloudinary.com/test-cloud/image/upload/test.jpg']) {
      assert.throws(() => serviceValues({ ...service, imageUrl: bad }), /valid service image/);
    }
    assert.throws(() => serviceValues({ ...service, unit: '  ' }), /name and unit/);
  } finally {
    if (old === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = old;
  }
});
