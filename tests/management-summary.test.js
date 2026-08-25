import test from 'node:test';
import assert from 'node:assert/strict';
import { managementSummary } from '../server/services/management-summary.js';

test('панель объединяет собираемость, долг и резерв проектов', () => {
  const summary = managementSummary({ charges: [{ amount: 10000, payments: [{ amount: 7000 }] }], payments: [{ amount: 7000 }], expenses: [{ amount: 2000 }], projects: [{ title: 'Дорога', status: 'IN_PROGRESS', collected: 8000, spent: 3000, deadline: null, tasks: [], updates: [{ createdAt: new Date('2026-08-24') }], updatedAt: new Date('2026-08-24') }], issues: [], now: new Date('2026-08-25') });
  assert.equal(summary.finances.collectionRate, 70);
  assert.equal(summary.finances.debt, 3000);
  assert.equal(summary.finances.reserved, 5000);
});

test('панель обнаруживает просрочки, забытые проекты и неназначенные заявки', () => {
  const summary = managementSummary({ projects: [{ title: 'Свет', status: 'IN_PROGRESS', collected: 0, spent: 0, deadline: new Date('2026-08-01'), tasks: [{ status: 'TODO', dueAt: new Date('2026-08-02') }], updates: [], updatedAt: new Date('2026-07-01') }], issues: [{ number: 4, title: 'Не работает фонарь', description: '', status: 'NEW', responsible: null, dueAt: null }], now: new Date('2026-08-25') });
  assert.equal(summary.projects.overdue, 1);
  assert.equal(summary.attention.overdueTasks, 1);
  assert.equal(summary.attention.staleProjects, 1);
  assert.equal(summary.issues.unassigned, 1);
  assert.equal(summary.topics[0].title, 'Освещение');
});
