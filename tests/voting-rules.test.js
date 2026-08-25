import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePollResult } from '../server/services/voting-rules.js';

const closedPoll = (votes, overrides = {}) => ({ eligibleVoters: 10, quorumPercent: 30, approvalPercent: 60, closesAt: new Date('2026-08-01'), votes, ...overrides });

test('голосование проходит только с кворумом, поддержкой и после срока', () => {
  const result = calculatePollResult(closedPoll([{ choice: 'SUPPORT' }, { choice: 'SUPPORT' }, { choice: 'OPPOSE' }]));
  assert.equal(result.quorumReached, true);
  assert.equal(result.approvalReached, true);
  assert.equal(result.passed, true);
});

test('поддержка без кворума не позволяет создать проект', () => {
  const result = calculatePollResult(closedPoll([{ choice: 'SUPPORT' }, { choice: 'SUPPORT' }]));
  assert.equal(result.approvalReached, true);
  assert.equal(result.quorumReached, false);
  assert.equal(result.passed, false);
});

test('до даты завершения положительный результат предварительный', () => {
  const result = calculatePollResult(closedPoll([{ choice: 'SUPPORT' }, { choice: 'SUPPORT' }, { choice: 'SUPPORT' }], { closesAt: new Date('2027-01-01') }));
  assert.equal(result.closed, false);
  assert.equal(result.passed, false);
});
