import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { isStaff } from '../access.js';
import { allowRoles } from '../middleware/authentication.js';
import { canTransitionIssue, validateIssueCompletion } from '../services/issue-workflow.js';

export const issuesRouter = Router();

issuesRouter.get('/', async (request, response, next) => {
  try {
    const where = isStaff(request.membership.role) ? { communityId: request.membership.communityId } : { communityId: request.membership.communityId, authorId: request.membership.userId };
    response.json(await database.issue.findMany({ where, include: { history: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } }));
  } catch (error) { next(error); }
});

issuesRouter.post('/', async (request, response, next) => {
  try {
    const { title, description, address, beforePhotoUrl } = request.body;
    if (!title || !address) return response.status(400).json({ error: 'Укажите проблему и адрес.' });
    const communityId = request.membership.communityId;
    const lastIssue = await database.issue.findFirst({ where: { communityId }, orderBy: { number: 'desc' }, select: { number: true } });
    const issue = await database.issue.create({ data: { communityId, authorId: request.membership.userId, number: (lastIssue?.number || 0) + 1, title: title.trim(), description: description?.trim() || null, address: address.trim(), beforePhotoUrl: beforePhotoUrl?.trim() || null, history: { create: { actorId: request.membership.userId, toStatus: 'NEW', comment: 'Обращение создано' } } }, include: { history: true } });
    await audit({ communityId, actorId: request.membership.userId, action: 'created', entityType: 'Issue', entityId: issue.id, after: issue });
    response.status(201).json(issue);
  } catch (error) { next(error); }
});

issuesRouter.patch('/:issueId', allowRoles('assistant_chairman', 'board_member', 'chairman', 'administrator'), async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const issue = await database.issue.findFirst({ where: { id: request.params.issueId, communityId } });
    if (!issue) return response.status(404).json({ error: 'Обращение не найдено.' });
    const status = request.body.status || issue.status;
    if (!canTransitionIssue(issue.status, status)) return response.status(409).json({ error: `Переход ${issue.status} → ${status} недоступен.` });
    const nextValues = {
      responsible: request.body.responsible?.trim() || issue.responsible,
      dueAt: request.body.dueAt === null ? null : request.body.dueAt ? new Date(request.body.dueAt) : issue.dueAt,
      resultNote: request.body.resultNote?.trim() || issue.resultNote,
      afterPhotoUrl: request.body.afterPhotoUrl?.trim() || issue.afterPhotoUrl
    };
    const completionError = validateIssueCompletion(status, nextValues);
    if (completionError) return response.status(400).json({ error: completionError });
    const updated = await database.issue.update({
      where: { id: issue.id },
      data: { status, ...nextValues, history: status !== issue.status ? { create: { actorId: request.membership.userId, fromStatus: issue.status, toStatus: status, comment: request.body.comment?.trim() || null } } : undefined },
      include: { history: { orderBy: { createdAt: 'asc' } } }
    });
    await audit({ communityId, actorId: request.membership.userId, action: 'updated', entityType: 'Issue', entityId: updated.id, before: issue, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});
