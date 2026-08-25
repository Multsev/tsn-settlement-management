import test from 'node:test';
import assert from 'node:assert/strict';
import { digestSummary, wantsNotification, weekRange } from '../server/services/notification-rules.js';

test('уровень уведомлений ограничивает обычные объявления', () => {
  assert.equal(wantsNotification('ONLY_IMPORTANT', 'ANNOUNCEMENT', 'NORMAL'), false);
  assert.equal(wantsNotification('ONLY_IMPORTANT', 'ANNOUNCEMENT', 'IMPORTANT'), true);
  assert.equal(wantsNotification('ALL', 'ANNOUNCEMENT', 'NORMAL'), true);
});

test('обновления проектов получают подписчики проектного уровня', () => {
  assert.equal(wantsNotification('ONLY_IMPORTANT', 'PROJECT_UPDATE'), false);
  assert.equal(wantsNotification('IMPORTANT_AND_PROJECTS', 'PROJECT_UPDATE'), true);
  assert.equal(wantsNotification('ALL', 'PROJECT_UPDATE'), true);
});

test('границы дайджеста соответствуют календарной неделе', () => {
  const { start, end } = weekRange(new Date('2026-08-26T12:00:00Z'));
  assert.equal(start.getDay(), 1);
  assert.equal((end - start) / 86400000, 7);
});

test('дайджест объединяет результаты, сборы, проекты и действия', () => {
  const summary = digestSummary({
    projectUpdates: [{ message: 'Дорога завершена', progress: 100, project: { title: 'Дорога' } }],
    completedIssues: [{ title: 'Фонарь', resultNote: 'Фонарь заменен' }],
    payments: [{ amount: 3000 }, { amount: 2000 }],
    activeProjects: [{ id: 'one' }, { id: 'two' }],
    openPolls: [{ id: 'poll' }]
  });
  assert.deepEqual(summary.results, ['Фонарь заменен', 'Дорога завершена']);
  assert.equal(summary.collected, 5000);
  assert.equal(summary.activeProjects, 2);
  assert.equal(summary.actionsRequired, 1);
});
