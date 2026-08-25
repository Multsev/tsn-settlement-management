import test from 'node:test';
import assert from 'node:assert/strict';
import { chargeStatus, financialTotals, projectExpenseIncrement } from '../server/services/finance-rules.js';

test('начисление становится оплаченным после суммы частичных платежей', () => {
  assert.equal(chargeStatus(3500, 1500, new Date('2026-09-01'), new Date('2026-08-25')), 'OPEN');
  assert.equal(chargeStatus(3500, 3500, new Date('2026-09-01'), new Date('2026-08-25')), 'PAID');
});

test('неоплаченное начисление становится просроченным после срока', () => {
  assert.equal(chargeStatus(3500, 1000, new Date('2026-08-01'), new Date('2026-08-25')), 'OVERDUE');
});

test('сводка связывает поступления, расходы, долг и остаток', () => {
  assert.deepEqual(financialTotals({ payments: [{ amount: 10000 }, { amount: 5000 }], expenses: [{ amount: 4000 }], openCharges: [{ amount: 3500, paidAmount: 1000 }] }), { received: 15000, spent: 4000, debt: 2500, balance: 11000 });
});

test('расход формирует атомарное увеличение фактических трат проекта', () => {
  assert.deepEqual(projectExpenseIncrement(97000), { spent: { increment: 97000 } });
  assert.throws(() => projectExpenseIncrement(0));
});
