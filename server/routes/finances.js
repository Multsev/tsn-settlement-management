import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { chargeStatus, financialTotals, projectExpenseIncrement } from '../services/finance-rules.js';

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

financesRouter.get('/overview', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const [payments, expenses, charges, fundraisers] = await Promise.all([
      database.payment.findMany({ where: { communityId }, orderBy: { paidAt: 'desc' }, take: 100 }),
      database.expense.findMany({ where: { communityId }, include: { project: { select: { id: true, title: true } } }, orderBy: { spentAt: 'desc' }, take: 100 }),
      database.charge.findMany({ where: { communityId, status: { in: ['OPEN', 'OVERDUE'] } }, include: { payments: { select: { amount: true } } } }),
      database.fundraiser.findMany({ where: { communityId, status: { not: 'CANCELLED' } }, include: { project: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' } })
    ]);
    const openCharges = charges.map(charge => ({ ...charge, paidAmount: charge.payments.reduce((sum, payment) => sum + payment.amount, 0) }));
    response.json({ totals: financialTotals({ payments, expenses, openCharges }), expenses, fundraisers });
  } catch (error) { next(error); }
});

financesRouter.get('/admin-options', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const [memberships, projects, openCharges] = await Promise.all([
      database.membership.findMany({ where: { communityId, approvedAt: { not: null } }, include: { user: { select: { fullName: true } }, properties: true }, orderBy: { user: { fullName: 'asc' } } }),
      database.project.findMany({ where: { communityId }, select: { id: true, title: true } }),
      database.charge.findMany({ where: { communityId, status: { in: ['OPEN', 'OVERDUE'] } }, include: { user: { select: { fullName: true } } } })
    ]);
    response.json({ memberships, projects, openCharges });
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
    const alreadyPaid = await database.payment.aggregate({ where: { chargeId: charge.id }, _sum: { amount: true } });
    const payment = await database.$transaction(async transaction => {
      const created = await transaction.payment.create({ data: { communityId: charge.communityId, userId: charge.userId, chargeId: charge.id, amount } });
      await transaction.charge.update({ where: { id: charge.id }, data: { status: chargeStatus(charge.amount, (alreadyPaid._sum.amount || 0) + amount, charge.dueAt) } });
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
    const communityId = request.membership.communityId;
    if (projectId && !(await database.project.findFirst({ where: { id: projectId, communityId } }))) return response.status(400).json({ error: 'Проект не принадлежит выбранному поселку.' });
    const expense = await database.$transaction(async transaction => {
      const created = await transaction.expense.create({ data: { communityId, amount, category, description, recipient, projectId: projectId || null } });
      if (projectId) await transaction.project.update({ where: { id: projectId }, data: projectExpenseIncrement(amount) });
      return created;
    });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Expense', entityId: expense.id, after: expense });
    response.status(201).json(expense);
  } catch (error) { next(error); }
});

financesRouter.post('/fundraisers', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { title, description, targetAmount, deadline, projectId } = request.body;
    if (!title || !description || !Number.isInteger(targetAmount) || targetAmount <= 0) return response.status(400).json({ error: 'Укажите название, описание и положительную цель сбора.' });
    const communityId = request.membership.communityId;
    if (projectId && !(await database.project.findFirst({ where: { id: projectId, communityId } }))) return response.status(400).json({ error: 'Проект не принадлежит выбранному поселку.' });
    const fundraiser = await database.fundraiser.create({ data: { communityId, title, description, targetAmount, deadline: deadline ? new Date(deadline) : null, projectId: projectId || null } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Fundraiser', entityId: fundraiser.id, after: fundraiser });
    response.status(201).json(fundraiser);
  } catch (error) { next(error); }
});

financesRouter.post('/fundraisers/:fundraiserId/contributions', async (request, response, next) => {
  try {
    const amount = request.body.amount;
    const communityId = request.membership.communityId;
    const fundraiser = await database.fundraiser.findFirst({ where: { id: request.params.fundraiserId, communityId, status: 'ACTIVE' } });
    if (!fundraiser || !Number.isInteger(amount) || amount <= 0) return response.status(400).json({ error: 'Укажите активный сбор и положительную сумму.' });
    const contribution = await database.$transaction(async transaction => {
      const created = await transaction.fundraiserContribution.create({ data: { communityId, fundraiserId: fundraiser.id, membershipId: request.membership.id, amount } });
      const updated = await transaction.fundraiser.update({ where: { id: fundraiser.id }, data: { collectedAmount: { increment: amount } } });
      if (updated.collectedAmount >= fundraiser.targetAmount) await transaction.fundraiser.update({ where: { id: fundraiser.id }, data: { status: 'COMPLETED' } });
      return created;
    });
    response.status(201).json(contribution);
  } catch (error) { next(error); }
});
