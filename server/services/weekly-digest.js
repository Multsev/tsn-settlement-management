import { database } from '../database.js';
import { digestSummary, weekRange } from './notification-rules.js';

export async function generateWeeklyDigest(communityId, reference = new Date()) {
  const { start, end } = weekRange(reference);
  const [projectUpdates, completedIssues, payments, activeProjects, openPolls] = await Promise.all([
    database.projectUpdate.findMany({ where: { project: { communityId }, createdAt: { gte: start, lt: end } }, include: { project: { select: { title: true } } }, orderBy: { createdAt: 'desc' } }),
    database.issue.findMany({ where: { communityId, status: { in: ['COMPLETED', 'CLOSED'] }, updatedAt: { gte: start, lt: end } }, select: { title: true, resultNote: true } }),
    database.payment.findMany({ where: { communityId, paidAt: { gte: start, lt: end } }, select: { amount: true } }),
    database.project.findMany({ where: { communityId, status: { in: ['PLANNED', 'FUNDRAISING', 'IN_PROGRESS'] } }, select: { id: true } }),
    database.poll.findMany({ where: { communityId, closesAt: { gt: new Date() } }, select: { id: true } })
  ]);
  const content = digestSummary({ projectUpdates, completedIssues, payments, activeProjects, openPolls });
  const title = `Эта неделя в поселке · ${start.toLocaleDateString('ru-RU')}`;
  return database.weeklyDigest.upsert({ where: { communityId_weekStart: { communityId, weekStart: start } }, update: { weekEnd: end, title, content }, create: { communityId, weekStart: start, weekEnd: end, title, content } });
}
