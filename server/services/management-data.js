import { database } from '../database.js';
import { managementSummary } from './management-summary.js';

export async function loadManagementSummary(communityId, now = new Date()) {
  const [charges, payments, expenses, projects, issues] = await Promise.all([
    database.charge.findMany({ where: { communityId }, include: { payments: { select: { amount: true } } } }),
    database.payment.findMany({ where: { communityId }, select: { amount: true } }),
    database.expense.findMany({ where: { communityId }, select: { amount: true } }),
    database.project.findMany({ where: { communityId }, include: { tasks: true, updates: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
    database.issue.findMany({ where: { communityId } })
  ]);
  return managementSummary({ charges, payments, expenses, projects, issues, now });
}
