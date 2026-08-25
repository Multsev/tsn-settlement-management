import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { streetMetrics } from '../services/street-metrics.js';

export const streetsRouter = Router();

const streetInclude = {
  properties: { include: { charges: { include: { payments: { select: { amount: true } } } } }, orderBy: { number: 'asc' } }
};

streetsRouter.get('/', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const [streets, activeIssues] = await Promise.all([
      database.street.findMany({ where: { communityId }, include: streetInclude, orderBy: { name: 'asc' } }),
      database.issue.findMany({ where: { communityId, status: { notIn: ['COMPLETED', 'CLOSED'] } }, select: { id: true, address: true } })
    ]);
    response.json(streets.map(street => ({
      ...street,
      metrics: { ...streetMetrics(street.properties), activeIssues: activeIssues.filter(issue => issue.address.toLocaleLowerCase('ru-RU').includes(street.name.toLocaleLowerCase('ru-RU'))).length },
      properties: street.properties.map(({ charges, ...property }) => property)
    })));
  } catch (error) { next(error); }
});

streetsRouter.post('/', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { name, roadCondition, lightingCoverage = 0, note } = request.body;
    if (!name?.trim() || !Number.isInteger(Number(lightingCoverage)) || Number(lightingCoverage) < 0 || Number(lightingCoverage) > 100) return response.status(400).json({ error: 'Укажите название улицы и освещение от 0 до 100%.' });
    const street = await database.street.create({ data: { communityId: request.membership.communityId, name: name.trim(), roadCondition: roadCondition?.trim() || null, lightingCoverage: Number(lightingCoverage), note: note?.trim() || null } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Street', entityId: street.id, after: street });
    response.status(201).json(street);
  } catch (error) { next(error); }
});
