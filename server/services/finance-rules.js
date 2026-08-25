export function chargeStatus(chargeAmount, paidAmount, dueAt, now = new Date()) {
  if (paidAmount >= chargeAmount) return 'PAID';
  if (dueAt && new Date(dueAt) < now) return 'OVERDUE';
  return 'OPEN';
}

export function financialTotals({ payments = [], expenses = [], openCharges = [] }) {
  const received = payments.reduce((sum, item) => sum + item.amount, 0);
  const spent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const debt = openCharges.reduce((sum, item) => sum + Math.max(0, item.amount - (item.paidAmount || 0)), 0);
  return { received, spent, debt, balance: received - spent };
}

export function projectExpenseIncrement(amount) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Expense amount must be a positive integer.');
  return { spent: { increment: amount } };
}
