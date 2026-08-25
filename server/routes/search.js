import { Router } from 'express';
import { database } from '../database.js';
import { groupedSearchResults, normalizedSearchQuery } from '../services/search-rules.js';
import { isStaff } from '../access.js';

export const searchRouter = Router();

searchRouter.get('/', async (request, response, next) => {
  try {
    const query = normalizedSearchQuery(request.query.q);
    if (!query) return response.status(400).json({ error: 'Введите от 2 до 100 символов для поиска.' });
    const communityId = request.membership.communityId;
    const contains = { contains: query, mode: 'insensitive' };
    const [projects, decisions, documents, streets, issues, expenses] = await Promise.all([
      database.project.findMany({ where: { communityId, OR: [{ title: contains }, { description: contains }, { category: contains }] }, select: { id: true, title: true, description: true, status: true }, take: 20 }),
      database.decision.findMany({ where: { communityId, OR: [{ title: contains }, { description: contains }, { basis: contains }] }, select: { id: true, title: true, description: true, status: true }, take: 20 }),
      database.communityDocument.findMany({ where: { communityId, OR: [{ title: contains }, { description: contains }] }, select: { id: true, title: true, description: true, type: true, url: true }, take: 20 }),
      database.street.findMany({ where: { communityId, OR: [{ name: contains }, { note: contains }, { roadCondition: contains }] }, select: { id: true, name: true, note: true, roadCondition: true }, take: 20 }),
      database.issue.findMany({ where: { communityId, ...(!isStaff(request.membership.role) ? { authorId: request.membership.userId } : {}), OR: [{ title: contains }, { description: contains }, { address: contains }] }, select: { id: true, number: true, title: true, description: true, address: true, status: true }, take: 20 }),
      database.expense.findMany({ where: { communityId, OR: [{ description: contains }, { category: contains }, { recipient: contains }] }, select: { id: true, description: true, category: true, recipient: true, amount: true, spentAt: true }, take: 20 })
    ]);
    response.json({ query, results: groupedSearchResults({ PROJECT: projects, DECISION: decisions, DOCUMENT: documents, STREET: streets, ISSUE: issues, EXPENSE: expenses }) });
  } catch (error) { next(error); }
});
