import test from 'node:test';
import assert from 'node:assert/strict';
import { mapBounds, validCoordinates } from '../server/services/map-rules.js';

test('координаты ограничены географическим диапазоном', () => {
  assert.equal(validCoordinates(45.2, 38.9), true);
  assert.equal(validCoordinates('', 38.9), false);
  assert.equal(validCoordinates(91, 38.9), false);
});

test('границы карты охватывают все расположенные объекты', () => {
  const bounds = mapBounds([{ latitude: 45.2, longitude: 38.9 }, { latitude: 45.3, longitude: 39.1 }, { latitude: null, longitude: null }]);
  assert.ok(bounds.north > 45.3);
  assert.ok(bounds.south < 45.2);
  assert.ok(bounds.east > 39.1);
  assert.ok(bounds.west < 38.9);
});
