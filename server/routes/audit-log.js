import { Router } from 'express';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';

export const auditLogRouter = Router();
const roles = ['board_member', 'chairman', 'administrator'];

auditLogRouter.get('/', allowRoles(...roles), async (request, response, next) => {
  try {
    const where = { communityId: request.membership.communityId, ...(request.query.entityType ? { entityType: request.query.entityType } : {}), ...(request.query.action ? { action: request.query.action } : {}) };
    response.json(await database.auditLog.findMany({ where, include: { actor: { select: { fullName: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }));
  } catch (error) { next(error); }
});

auditLogRouter.get('/entity/:entityType/:entityId', allowRoles(...roles), async (request, response, next) => {
  try { response.json(await database.auditLog.findMany({ where: { communityId: request.membership.communityId, entityType: request.params.entityType, entityId: request.params.entityId }, include: { actor: { select: { fullName: true } } }, orderBy: { createdAt: 'asc' } })); } catch (error) { next(error); }
});
