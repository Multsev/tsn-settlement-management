import test from 'node:test';
import assert from 'node:assert/strict';
import { streetMetrics } from '../server/services/street-metrics.js';

test('паспорт улицы считает участки, заселение и собираемость', () => {
  const metrics = streetMetrics([
    { membershipId: 'member-1', charges: [{ amount: 4000, payments: [{ amount: 4000 }] }] },
    { membershipId: null, charges: [{ amount: 6000, payments: [{ amount: 1000 }] }] }
  ]);
  assert.deepEqual(metrics, { properties: 2, occupied: 1, charged: 10000, paid: 5000, collectionRate: 50 });
});

test('улица без начислений имеет нулевую собираемость', () => {
  assert.equal(streetMetrics([{ membershipId: 'member-1', charges: [] }]).collectionRate, 0);
});
