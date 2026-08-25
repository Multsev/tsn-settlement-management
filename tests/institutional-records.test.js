import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionDecision, contractorPortfolio, isPublicDocumentUrl, validContractorRating, validateDecisionExecution } from '../server/services/institutional-records.js';

test('решение проходит путь от принятия до исполнения', () => {
  assert.equal(canTransitionDecision('ADOPTED', 'IN_PROGRESS'), true);
  assert.equal(canTransitionDecision('IN_PROGRESS', 'EXECUTED'), true);
  assert.equal(canTransitionDecision('ADOPTED', 'CANCELLED'), true);
  assert.equal(canTransitionDecision('EXECUTED', 'CANCELLED'), false);
});

test('исполненное решение требует зафиксировать результат', () => {
  assert.match(validateDecisionExecution('EXECUTED', ''), /результат/i);
  assert.equal(validateDecisionExecution('EXECUTED', 'Дорога принята комиссией'), null);
});

test('хранилище принимает только публичные http-ссылки', () => {
  assert.equal(isPublicDocumentUrl('https://storage.example.test/act.pdf'), true);
  assert.equal(isPublicDocumentUrl('file:///private/act.pdf'), false);
  assert.equal(isPublicDocumentUrl('не ссылка'), false);
});

test('портфель подрядчика объединяет проекты и договорную стоимость', () => {
  const portfolio = contractorPortfolio([
    { contractAmount: 400000, project: { status: 'COMPLETED' } },
    { contractAmount: 600000, project: { status: 'IN_PROGRESS' } }
  ]);
  assert.deepEqual(portfolio, { projects: 2, contractTotal: 1000000, completedProjects: 1 });
  assert.equal(validContractorRating(5), true);
  assert.equal(validContractorRating(6), false);
});
