import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionIssue, validateIssueCompletion } from '../server/services/issue-workflow.js';

test('обращение проходит рабочий жизненный цикл', () => {
  assert.equal(canTransitionIssue('NEW', 'ACCEPTED'), true);
  assert.equal(canTransitionIssue('ACCEPTED', 'IN_PROGRESS'), true);
  assert.equal(canTransitionIssue('IN_PROGRESS', 'COMPLETED'), true);
  assert.equal(canTransitionIssue('COMPLETED', 'CLOSED'), true);
});

test('нельзя перескочить из нового обращения сразу в выполненное', () => {
  assert.equal(canTransitionIssue('NEW', 'COMPLETED'), false);
});

test('завершение требует результата и фото после', () => {
  assert.match(validateIssueCompletion('COMPLETED', {}), /результат/i);
  assert.match(validateIssueCompletion('COMPLETED', { resultNote: 'Фонарь заменен' }), /фото/i);
  assert.equal(validateIssueCompletion('COMPLETED', { resultNote: 'Фонарь заменен', afterPhotoUrl: 'https://example.test/after.jpg' }), null);
});
