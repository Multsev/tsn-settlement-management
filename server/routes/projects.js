import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { calculatePollResult } from '../services/voting-rules.js';

export const projectsRouter = Router();

projectsRouter.get('/', async (request, response, next) => {
  try { response.json(await database.project.findMany({ where: { communityId: request.membership.communityId }, include: { updates: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' } })); }
  catch (error) { next(error); }
});

projectsRouter.post('/from-proposal/:proposalId', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const proposal = await database.proposal.findFirst({ where: { id: request.params.proposalId, communityId }, include: { poll: { include: { votes: true } }, project: true } });
    if (!proposal) return response.status(404).json({ error: 'Инициатива не найдена.' });
    if (proposal.project) return response.status(409).json({ error: 'По этой инициативе уже создан проект.' });
    if (!proposal.poll || !calculatePollResult(proposal.poll).passed) return response.status(409).json({ error: 'Проект можно создать только после завершенного голосования с достигнутыми кворумом и поддержкой.' });
    const { budget = proposal.preliminaryBudget || 0, deadline } = request.body;
    const project = await database.$transaction(async transaction => {
      const created = await transaction.project.create({ data: { communityId, proposalId: proposal.id, title: proposal.title, description: proposal.description, category: proposal.category, budget: Number(budget), deadline: deadline ? new Date(deadline) : null } });
      await transaction.proposal.update({ where: { id: proposal.id }, data: { status: 'CONVERTED' } });
      return created;
    });
    await audit({ communityId, actorId: request.membership.userId, action: 'created_from_approved_proposal', entityType: 'Project', entityId: project.id, after: project });
    response.status(201).json(project);
  } catch (error) { next(error); }
});
