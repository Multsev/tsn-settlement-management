import test from 'node:test';
import assert from 'node:assert/strict';
import { financeAdminContent, financeResidentContent } from '../src/finance-views.js';

const money = value => `${value} ₽`;

test('кабинет жителя показывает начисления, платежи и сборы', () => {
  const html = financeResidentContent({ money, totals: { balance: 6500, received: 10000, spent: 3500 }, my: { charges: [{ period: 'Август', amount: 3500, status: 'PAID', property: { street: 'Калинина', number: '157' } }], payments: [{ amount: 3500, paidAt: '2026-08-05' }] }, fundraisers: [{ id: 'f1', title: 'Мусор', description: 'Вывоз', targetAmount: 35000, collectedAmount: 28000, status: 'ACTIVE' }] });
  assert.match(html, /Август/);
  assert.match(html, /История платежей/);
  assert.match(html, /28000 ₽ из 35000 ₽/);
});

test('реестр председателя фильтрует расходы и сохраняет связь с проектом', () => {
  const expenses = [{ amount: 970000, description: 'Асфальт', category: 'Дороги', recipient: 'Подрядчик', spentAt: '2026-08-20', project: { title: 'Центральная улица' } }, { amount: 5000, description: 'Лампы', category: 'Свет', recipient: 'Магазин', spentAt: '2026-08-21', project: null }];
  const html = financeAdminContent({ money, totals: { debt: 1000 }, expenses, expenseFilter: 'центральная' });
  assert.match(html, /Асфальт/);
  assert.match(html, /Центральная улица/);
  assert.doesNotMatch(html, /Лампы/);
});
