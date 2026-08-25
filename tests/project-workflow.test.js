import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionProject, canTransitionTask, projectAttention, roadmapGroups, taskProgress, validateProjectCompletion } from '../server/services/project-workflow.js';

test('проект проходит полный операционный цикл', () => {
  assert.equal(canTransitionProject('IDEA', 'ESTIMATION'), true);
  assert.equal(canTransitionProject('ESTIMATION', 'PLANNED'), true);
  assert.equal(canTransitionProject('PLANNED', 'IN_PROGRESS'), true);
  assert.equal(canTransitionProject('IN_PROGRESS', 'COMPLETED'), true);
  assert.equal(canTransitionProject('IDEA', 'COMPLETED'), false);
});

test('задачи определяют готовность проекта', () => {
  const tasks = [{ status: 'DONE' }, { status: 'IN_PROGRESS' }, { status: 'CANCELLED' }];
  assert.equal(taskProgress(tasks), 50);
  assert.equal(canTransitionTask('TODO', 'IN_PROGRESS'), true);
  assert.equal(canTransitionTask('IN_PROGRESS', 'DONE'), true);
});

test('завершение требует закрытых задач, результата и фото', () => {
  assert.match(validateProjectCompletion({ tasks: [] }), /результат/i);
  assert.match(validateProjectCompletion({ resultNote: 'Дорога готова', tasks: [] }), /фотограф/i);
  assert.match(validateProjectCompletion({ resultNote: 'Дорога готова', afterPhotoUrl: 'https://example.test/after.jpg', tasks: [{ status: 'TODO' }] }), /задач/i);
  assert.equal(validateProjectCompletion({ resultNote: 'Дорога готова', afterPhotoUrl: 'https://example.test/after.jpg', tasks: [{ status: 'DONE' }] }), null);
});

test('дорожная карта группирует проекты по году и кварталу', () => {
  const groups = roadmapGroups([
    { id: 'summer', startAt: '2026-07-10', createdAt: '2026-01-01' },
    { id: 'spring', deadline: '2026-05-10', createdAt: '2026-01-01' },
    { id: 'future', startAt: '2027-01-10', createdAt: '2026-01-01' }
  ]);
  assert.deepEqual(groups.map(group => `${group.year}-Q${group.quarter}`), ['2026-Q2', '2026-Q3', '2027-Q1']);
});

test('панель внимания находит просрочки и давно не обновленные проекты', () => {
  const attention = projectAttention([{ id: 'road', status: 'IN_PROGRESS', deadline: '2026-08-01', createdAt: '2026-01-01', updates: [{ createdAt: '2026-08-01' }], tasks: [{ status: 'TODO', dueAt: '2026-08-10' }] }], new Date('2026-08-25'));
  assert.deepEqual(attention, [{ id: 'road', overdue: true, stale: true, overdueTasks: 1 }]);
});
