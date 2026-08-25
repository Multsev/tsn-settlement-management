import { Router } from 'express';
import { database } from '../database.js';
import { publicSession } from '../services/session-tokens.js';

export const accountRouter = Router();

accountRouter.get('/communities', async (request, response, next) => {
  try {
    const memberships = await database.membership.findMany({ where: { userId: request.membership.userId, approvedAt: { not: null }, suspendedAt: null }, include: { community: true }, orderBy: { community: { name: 'asc' } } });
    response.json(memberships.map(item => ({ membershipId: item.id, role: item.role, community: { id: item.community.id, name: item.community.name, slug: item.community.slug }, current: item.id === request.membership.id })));
  } catch (error) { next(error); }
});

accountRouter.post('/switch-community', async (request, response, next) => {
  try {
    const membership = await database.membership.findFirst({ where: { userId: request.membership.userId, communityId: request.body.communityId, approvedAt: { not: null }, suspendedAt: null }, include: { user: true, community: true } });
    if (!membership) return response.status(404).json({ error: 'Нет активного доступа к этому поселку.' });
    response.json(publicSession(membership.user, membership));
  } catch (error) { next(error); }
});
