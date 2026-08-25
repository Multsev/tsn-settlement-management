import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboard, money, projects } from '../src/data.js';

test('форматирует деньги в российском формате', () => {
  assert.equal(money(1420000), '1 420 000 ₽');
});

test('демо-проекты содержат данные для карточки прозрачности', () => {
  for (const project of projects) {
    assert.ok(project.title);
    assert.ok(project.budget >= project.spent);
    assert.ok(project.progress >= 0 && project.progress <= 100);
  }
  assert.equal(dashboard.projects.length, 3);
});
