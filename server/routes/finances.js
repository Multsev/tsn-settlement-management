import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';

export const financesRouter = Router();

financesRouter.get('/me', async (request, response, next) => {
  try {
    const where = { communityId: request.membership.communityId, userId: request.membership.userId };
    const [charges, payments] = await Promise.all([database.charge.findMany({ where, include: { property: { select: { number: true, street: true } } }, orderBy: { createdAt: 'desc' } }), database.payment.findMany({ where, orderBy: { paidAt: 'desc' } })]);
    response.json({ charges, payments });
  } catch (error) { next(error); }
});

financesRouter.get('/summary', allowRoles('chairman', 'administrator', 'board_member'), async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const [income, expenses, debt] = await Promise.all([database.payment.aggregate({ where: { communityId }, _sum: { amount: true } }), database.expense.aggregate({ where: { communityId }, _sum: { amount: true } }), database.charge.aggregate({ where: { communityId, status: { in: ['OPEN', 'OVERDUE'] } }, _sum: { amount: true } })]);
    response.json({ received: income._sum.amount || 0, spent: expenses._sum.amount || 0, debt: debt._sum.amount || 0 });
  } catch (error) { next(error); }
});

financesRouter.post('/charges', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { userId, propertyId, amount, period, dueAt } = request.body;
    if (!userId || !propertyId || !Number.isInteger(amount) || amount <= 0 || !period) return response.status(400).json({ error: 'Укажите жителя, участок, сумму и период начисления.' });
    const charge = await database.charge.create({ data: { communityId: request.membership.communityId, userId, propertyId, amount, period, dueAt: dueAt ? new Date(dueAt) : null } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Charge', entityId: charge.id, after: charge });
    response.status(201).json(charge);
  } catch (error) { next(error); }
});

financesRouter.post('/payments', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { chargeId, amount } = request.body;
    const charge = await database.charge.findFirst({ where: { id: chargeId, communityId: request.membership.communityId } });
    if (!charge || !Number.isInteger(amount) || amount <= 0) return response.status(400).json({ error: 'Укажите корректное начисление и сумму оплаты.' });
    const payment = await database.$transaction(async transaction => {
      const created = await transaction.payment.create({ data: { communityId: charge.communityId, userId: charge.userId, chargeId: charge.id, amount } });
      if (amount >= charge.amount) await transaction.charge.update({ where: { id: charge.id }, data: { status: 'PAID' } });
      return created;
    });
    await audit({ communityId: charge.communityId, actorId: request.membership.userId, action: 'recorded', entityType: 'Payment', entityId: payment.id, after: payment });
    response.status(201).json(payment);
  } catch (error) { next(error); }
});

financesRouter.post('/expenses', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { amount, category, description, recipient, projectId } = request.body;
    if (!Number.isInteger(amount) || amount <= 0 || !category || !description || !recipient) return response.status(400).json({ error: 'Укажите сумму, категорию, описание и получателя расхода.' });
    const expense = await database.expense.create({ data: { communityId: request.membership.communityId, amount, category, description, recipient, projectId: projectId || null } });
    if (projectId) await database.project.update({ where: { id: projectId }, data: { spent: { increment: amount } } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Expense', entityId: expense.id, after: expense });
    response.status(201).json(expense);
  } catch (error) { next(error); }
});
