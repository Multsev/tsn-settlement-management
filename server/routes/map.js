import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { mapBounds, mapFeatureTypes, validCoordinates } from '../services/map-rules.js';

export const mapRouter = Router();
const managers = ['chairman', 'administrator'];

mapRouter.get('/', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const [features, streets, properties, projects, issues] = await Promise.all([
      database.mapFeature.findMany({ where: { communityId }, orderBy: { title: 'asc' } }),
      database.street.findMany({ where: { communityId }, select: { id: true, name: true, roadCondition: true, mapPath: true } }),
      database.property.findMany({ where: { communityId, latitude: { not: null }, longitude: { not: null } }, select: { id: true, number: true, street: true, hasHouse: true, occupied: true, latitude: true, longitude: true } }),
      database.project.findMany({ where: { communityId, latitude: { not: null }, longitude: { not: null } }, select: { id: true, title: true, category: true, status: true, progress: true, latitude: true, longitude: true } }),
      database.issue.findMany({ where: { communityId, latitude: { not: null }, longitude: { not: null }, status: { notIn: ['CLOSED'] } }, select: { id: true, number: true, title: true, status: true, address: true, latitude: true, longitude: true } })
    ]);
    response.json({ bounds: mapBounds([...features, ...properties, ...projects, ...issues]), layers: { features, streets, properties, projects, issues } });
  } catch (error) { next(error); }
});

mapRouter.post('/features', allowRoles(...managers), async (request, response, next) => {
  try {
    const { type, title, description, status, latitude, longitude } = request.body;
    if (!mapFeatureTypes.includes(type) || !title?.trim() || !validCoordinates(latitude, longitude)) return response.status(400).json({ error: 'Укажите тип, название и корректные координаты объекта.' });
    const feature = await database.mapFeature.create({ data: { communityId: request.membership.communityId, type, title: title.trim(), description: description?.trim() || null, status: status?.trim() || null, latitude: Number(latitude), longitude: Number(longitude) } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'MapFeature', entityId: feature.id, after: feature });
    response.status(201).json(feature);
  } catch (error) { next(error); }
});

mapRouter.patch('/locations/:entity/:id', allowRoles(...managers), async (request, response, next) => {
  try {
    const models = { property: database.property, project: database.project, issue: database.issue };
    const model = models[request.params.entity];
    if (!model || !validCoordinates(request.body.latitude, request.body.longitude)) return response.status(400).json({ error: 'Укажите объект и корректные координаты.' });
    const target = await model.findFirst({ where: { id: request.params.id, communityId: request.membership.communityId } });
    if (!target) return response.status(404).json({ error: 'Объект карты не найден.' });
    const updated = await model.update({ where: { id: target.id }, data: { latitude: Number(request.body.latitude), longitude: Number(request.body.longitude) } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'location_updated', entityType: request.params.entity, entityId: target.id, before: { latitude: target.latitude, longitude: target.longitude }, after: { latitude: updated.latitude, longitude: updated.longitude } });
    response.json(updated);
  } catch (error) { next(error); }
});
