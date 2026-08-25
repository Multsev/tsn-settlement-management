import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { canTransitionDecision, validateDecisionExecution } from '../services/institutional-records.js';

export const decisionsRouter = Router();
const editorRoles = ['board_member', 'chairman', 'administrator'];
const include = { projects: { select: { id: true, title: true, status: true } }, documents: { select: { id: true, title: true, type: true, url: true } }, poll: { include: { proposal: { select: { title: true } } } } };

decisionsRouter.get('/', async (request, response, next) => {
  try { response.json(await database.decision.findMany({ where: { communityId: request.membership.communityId }, include, orderBy: { decidedAt: 'desc' } })); }
  catch (error) { next(error); }
});

decisionsRouter.post('/', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const { title, description, basis, type, adoptedBy, supportPercent, decidedAt, pollId, projectIds = [] } = request.body;
    const communityId = request.membership.communityId;
    if (!title?.trim() || !description?.trim() || !adoptedBy?.trim() || !['BOARD', 'GENERAL_MEETING', 'CHAIRMAN', 'POLL', 'OTHER'].includes(type)) return response.status(400).json({ error: 'Укажите название, описание, тип и кем принято решение.' });
    if (supportPercent != null && (!Number.isInteger(supportPercent) || supportPercent < 0 || supportPercent > 100)) return response.status(400).json({ error: 'Поддержка должна быть от 0 до 100%.' });
    const [projects, poll] = await Promise.all([
      database.project.findMany({ where: { id: { in: projectIds }, communityId }, select: { id: true } }),
      pollId ? database.poll.findFirst({ where: { id: pollId, communityId } }) : null
    ]);
    if (projects.length !== new Set(projectIds).size || (pollId && !poll)) return response.status(400).json({ error: 'Связанный проект или опрос не принадлежит поселку.' });
    const decision = await database.decision.create({ data: { communityId, title: title.trim(), description: description.trim(), basis: basis?.trim() || null, type, adoptedBy: adoptedBy.trim(), supportPercent: supportPercent ?? null, decidedAt: decidedAt ? new Date(decidedAt) : new Date(), pollId: pollId || null, projects: { connect: projects } }, include });
    await audit({ communityId, actorId: request.membership.userId, action: 'created', entityType: 'Decision', entityId: decision.id, after: decision });
    response.status(201).json(decision);
  } catch (error) { next(error); }
});

decisionsRouter.patch('/:decisionId', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const decision = await database.decision.findFirst({ where: { id: request.params.decisionId, communityId: request.membership.communityId } });
    if (!decision) return response.status(404).json({ error: 'Решение не найдено.' });
    const status = request.body.status || decision.status;
    const executionNote = request.body.executionNote?.trim() || decision.executionNote;
    if (!canTransitionDecision(decision.status, status)) return response.status(409).json({ error: `Переход решения ${decision.status} → ${status} недоступен.` });
    const executionError = validateDecisionExecution(status, executionNote);
    if (executionError) return response.status(400).json({ error: executionError });
    const updated = await database.decision.update({ where: { id: decision.id }, data: { status, executionNote }, include });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'updated', entityType: 'Decision', entityId: updated.id, before: decision, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});
