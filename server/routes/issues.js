import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { isStaff } from '../access.js';

export const issuesRouter = Router();

issuesRouter.get('/', async (request, response, next) => {
  try {
    const where = isStaff(request.membership.role) ? { communityId: request.membership.communityId } : { communityId: request.membership.communityId, authorId: request.membership.userId };
    response.json(await database.issue.findMany({ where, orderBy: { updatedAt: 'desc' } }));
  } catch (error) { next(error); }
});

issuesRouter.post('/', async (request, response, next) => {
  try {
    const { title, description, address } = request.body;
    if (!title || !address) return response.status(400).json({ error: 'Укажите проблему и адрес.' });
    const communityId = request.membership.communityId;
    const lastIssue = await database.issue.findFirst({ where: { communityId }, orderBy: { number: 'desc' }, select: { number: true } });
    const issue = await database.issue.create({ data: { communityId, authorId: request.membership.userId, number: (lastIssue?.number || 0) + 1, title, description, address } });
    await audit({ communityId, actorId: request.membership.userId, action: 'created', entityType: 'Issue', entityId: issue.id, after: issue });
    response.status(201).json(issue);
  } catch (error) { next(error); }
});
