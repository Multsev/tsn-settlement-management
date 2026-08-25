import test from 'node:test';
import assert from 'node:assert/strict';
import { groupedSearchResults, normalizedSearchQuery } from '../server/services/search-rules.js';

test('поисковая строка очищается и ограничивается', () => {
  assert.equal(normalizedSearchQuery('  ул.   Калинина '), 'ул. Калинина');
  assert.equal(normalizedSearchQuery('а'), null);
  assert.equal(normalizedSearchQuery('x'.repeat(101)), null);
});

test('результаты разных реестров получают явный тип', () => {
  assert.deepEqual(groupedSearchResults({ PROJECT: [{ id: 'p' }], STREET: [{ id: 's' }] }), [{ id: 'p', type: 'PROJECT' }, { id: 's', type: 'STREET' }]);
});
