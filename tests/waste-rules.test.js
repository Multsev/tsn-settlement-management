import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionPickup, wasteCategories } from '../server/services/waste-rules.js';

test('модуль различает четыре обязательных вида отходов', () => {
  assert.deepEqual(wasteCategories, ['HOUSEHOLD', 'GREEN', 'CONSTRUCTION', 'BULKY']);
});

test('заявка проходит контролируемый маршрут', () => {
  assert.equal(canTransitionPickup('PENDING', 'APPROVED'), true);
  assert.equal(canTransitionPickup('APPROVED', 'SCHEDULED'), true);
  assert.equal(canTransitionPickup('SCHEDULED', 'COMPLETED'), true);
  assert.equal(canTransitionPickup('PENDING', 'COMPLETED'), false);
});
