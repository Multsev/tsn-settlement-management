import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { isStaff } from '../access.js';
import { allowRoles } from '../middleware/authentication.js';

export const propertiesRouter = Router();

propertiesRouter.get('/', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const where = isStaff(request.membership.role) ? { communityId } : { communityId, membershipId: request.membership.id };
    const [properties, requests, availableProperties] = await Promise.all([
      database.property.findMany({ where, include: { streetRecord: true, membership: { include: { user: { select: { fullName: true } } } } }, orderBy: [{ street: 'asc' }, { number: 'asc' }] }),
      database.propertyAccessRequest.findMany({ where: isStaff(request.membership.role) ? { communityId } : { communityId, membershipId: request.membership.id }, include: { property: true, membership: { include: { user: { select: { fullName: true, email: true } } } } }, orderBy: { createdAt: 'desc' } }),
      isStaff(request.membership.role) ? Promise.resolve([]) : database.property.findMany({ where: { communityId, membershipId: null }, include: { streetRecord: true }, orderBy: [{ street: 'asc' }, { number: 'asc' }] })
    ]);
    response.json({ properties, accessRequests: requests, availableProperties });
  } catch (error) { next(error); }
});

propertiesRouter.post('/', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { number, streetId } = request.body;
    const street = await database.street.findFirst({ where: { id: streetId, communityId: request.membership.communityId } });
    if (!number?.trim() || !street) return response.status(400).json({ error: 'Укажите номер участка и улицу поселка.' });
    const property = await database.property.create({ data: { communityId: request.membership.communityId, number: number.trim(), street: street.name, streetId: street.id } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Property', entityId: property.id, after: property });
    response.status(201).json(property);
  } catch (error) { next(error); }
});

propertiesRouter.post('/:propertyId/access-requests', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const property = await database.property.findFirst({ where: { id: request.params.propertyId, communityId } });
    if (!property) return response.status(404).json({ error: 'Участок не найден.' });
    if (property.membershipId && property.membershipId !== request.membership.id) return response.status(409).json({ error: 'Участок уже привязан к другому жителю.' });
    const pending = await database.propertyAccessRequest.findFirst({ where: { propertyId: property.id, membershipId: request.membership.id, status: 'PENDING' } });
    if (pending) return response.status(409).json({ error: 'Заявка на этот участок уже рассматривается.' });
    const accessRequest = await database.propertyAccessRequest.create({ data: { communityId, propertyId: property.id, membershipId: request.membership.id, note: request.body.note?.trim() || null } });
    response.status(201).json(accessRequest);
  } catch (error) { next(error); }
});

propertiesRouter.patch('/access-requests/:requestId', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { status, reviewNote } = request.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) return response.status(400).json({ error: 'Выберите решение по заявке.' });
    const accessRequest = await database.propertyAccessRequest.findFirst({ where: { id: request.params.requestId, communityId: request.membership.communityId, status: 'PENDING' }, include: { property: true } });
    if (!accessRequest) return response.status(404).json({ error: 'Активная заявка не найдена.' });
    if (status === 'APPROVED' && accessRequest.property.membershipId && accessRequest.property.membershipId !== accessRequest.membershipId) return response.status(409).json({ error: 'Участок уже привязан к другому жителю.' });
    const updated = await database.$transaction(async transaction => {
      if (status === 'APPROVED') await transaction.property.update({ where: { id: accessRequest.propertyId }, data: { membershipId: accessRequest.membershipId } });
      return transaction.propertyAccessRequest.update({ where: { id: accessRequest.id }, data: { status, reviewNote: reviewNote?.trim() || null, reviewedById: request.membership.userId, reviewedAt: new Date() } });
    });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: status.toLocaleLowerCase(), entityType: 'PropertyAccessRequest', entityId: updated.id, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});
