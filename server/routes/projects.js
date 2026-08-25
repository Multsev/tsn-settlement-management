import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';

export const projectsRouter = Router();

projectsRouter.get('/', async (request, response, next) => {
  try { response.json(await database.project.findMany({ where: { communityId: request.membership.communityId }, include: { updates: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' } })); }
  catch (error) { next(error); }
});

projectsRouter.post('/', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { title, description, category, budget = 0, deadline } = request.body;
    if (!title || !description || !category) return response.status(400).json({ error: 'Заполните название, описание и категорию.' });
    const project = await database.project.create({ data: { communityId: request.membership.communityId, title, description, category, budget: Number(budget), deadline: deadline ? new Date(deadline) : null } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Project', entityId: project.id, after: project });
    response.status(201).json(project);
  } catch (error) { next(error); }
});
