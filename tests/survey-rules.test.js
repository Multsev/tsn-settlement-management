import test from 'node:test';
import assert from 'node:assert/strict';
import { canRespondToSurvey, normalizedSurveyOptions, surveyResults } from '../server/services/survey-rules.js';

test('варианты очищаются и не дублируются', () => {
  assert.deepEqual(normalizedSurveyOptions([' Дороги ', 'Камеры', 'Дороги', '']), ['Дороги', 'Камеры']);
});

test('ответ доступен только в активном временном окне', () => {
  const now = new Date('2026-08-25T12:00:00Z');
  assert.equal(canRespondToSurvey({ status: 'ACTIVE', opensAt: new Date('2026-08-24'), closesAt: new Date('2026-08-26') }, now), true);
  assert.equal(canRespondToSurvey({ status: 'CLOSED', opensAt: null, closesAt: null }, now), false);
});

test('результаты прозрачны в голосах и процентах', () => {
  const options = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  const result = surveyResults({ options, responses: [{ optionId: 'a' }, { optionId: 'a' }, { optionId: 'b' }] });
  assert.deepEqual(result.map(item => [item.votes, item.percent]), [[2, 67], [1, 33]]);
});
