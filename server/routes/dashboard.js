import { Router } from 'express';
import { database } from '../database.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const userId = request.membership.userId;
    const [projects, income, expenses, charges, payments] = await Promise.all([
      database.project.findMany({ where: { communityId, status: { in: ['IN_PROGRESS', 'FUNDRAISING', 'PLANNED'] } }, orderBy: { updatedAt: 'desc' }, take: 3 }),
      database.payment.aggregate({ where: { communityId }, _sum: { amount: true } }),
      database.expense.aggregate({ where: { communityId }, _sum: { amount: true } }),
      database.charge.aggregate({ where: { communityId, userId, status: { in: ['OPEN', 'OVERDUE'] } }, _sum: { amount: true } }),
      database.payment.findMany({ where: { communityId, userId }, orderBy: { paidAt: 'desc' }, take: 5 })
    ]);
    const received = income._sum.amount || 0;
    const spent = expenses._sum.amount || 0;
    response.json({ community: request.membership.community.name, finances: { balance: received - spent, received, spent }, myDebt: charges._sum.amount || 0, projects, payments });
  } catch (error) { next(error); }
});
