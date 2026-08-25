import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { canTransitionProject, canTransitionTask, projectAttention, roadmapGroups, taskProgress, validateProjectCompletion } from '../services/project-workflow.js';
import { calculatePollResult } from '../services/voting-rules.js';
import { notifyCommunity } from '../services/notification-delivery.js';

export const projectsRouter = Router();
const projectWorkerRoles = ['assistant_chairman', 'board_member', 'chairman', 'administrator'];
const projectInclude = {
  street: { select: { id: true, name: true } },
  updates: { orderBy: { createdAt: 'desc' }, take: 20 },
  tasks: { orderBy: [{ status: 'asc' }, { dueAt: 'asc' }] },
  history: { orderBy: { createdAt: 'asc' } },
  expenses: { select: { id: true, amount: true, category: true, description: true, spentAt: true } },
  fundraisers: { select: { id: true, title: true, targetAmount: true, collectedAmount: true, status: true } },
  documents: { select: { id: true, title: true, type: true, url: true } },
  decisions: { select: { id: true, title: true, status: true, decidedAt: true } },
  contractorLinks: { include: { contractor: { select: { id: true, name: true, rating: true } } } }
};

projectsRouter.get('/roadmap', async (request, response, next) => {
  try {
    const projects = await database.project.findMany({ where: { communityId: request.membership.communityId, status: { not: 'CANCELLED' } }, include: projectInclude, orderBy: [{ startAt: 'asc' }, { deadline: 'asc' }] });
    response.json(roadmapGroups(projects));
  } catch (error) { next(error); }
});

projectsRouter.get('/attention', allowRoles(...projectWorkerRoles), async (request, response, next) => {
  try {
    const projects = await database.project.findMany({ where: { communityId: request.membership.communityId }, include: { updates: { orderBy: { createdAt: 'desc' }, take: 1 }, tasks: true } });
    response.json(projectAttention(projects));
  } catch (error) { next(error); }
});

projectsRouter.get('/', async (request, response, next) => {
  try { response.json(await database.project.findMany({ where: { communityId: request.membership.communityId }, include: projectInclude, orderBy: { updatedAt: 'desc' } })); }
  catch (error) { next(error); }
});

projectsRouter.post('/from-proposal/:proposalId', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const proposal = await database.proposal.findFirst({ where: { id: request.params.proposalId, communityId }, include: { poll: { include: { votes: true } }, project: true } });
    if (!proposal) return response.status(404).json({ error: 'Инициатива не найдена.' });
    if (proposal.project) return response.status(409).json({ error: 'По этой инициативе уже создан проект.' });
    if (!proposal.poll || !calculatePollResult(proposal.poll).passed) return response.status(409).json({ error: 'Проект можно создать только после завершенного голосования с достигнутыми кворумом и поддержкой.' });
    const { budget = proposal.preliminaryBudget || 0, deadline, startAt, streetId, responsible, priority = 'NORMAL', fundingSource } = request.body;
    if (streetId && !(await database.street.findFirst({ where: { id: streetId, communityId } }))) return response.status(400).json({ error: 'Улица не принадлежит выбранному поселку.' });
    const project = await database.$transaction(async transaction => {
      const created = await transaction.project.create({ data: { communityId, proposalId: proposal.id, title: proposal.title, description: proposal.description, category: proposal.category, budget: Number(budget), deadline: deadline ? new Date(deadline) : null, startAt: startAt ? new Date(startAt) : null, streetId: streetId || null, responsible: responsible?.trim() || null, priority, fundingSource: fundingSource?.trim() || null, history: { create: { actorId: request.membership.userId, toStatus: 'IDEA', comment: 'Проект создан из одобренной инициативы' } } } });
      await transaction.proposal.update({ where: { id: proposal.id }, data: { status: 'CONVERTED' } });
      return created;
    });
    await audit({ communityId, actorId: request.membership.userId, action: 'created_from_approved_proposal', entityType: 'Project', entityId: project.id, after: project });
    response.status(201).json(project);
  } catch (error) { next(error); }
});

projectsRouter.patch('/:projectId', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const project = await database.project.findFirst({ where: { id: request.params.projectId, communityId }, include: { tasks: true } });
    if (!project) return response.status(404).json({ error: 'Проект не найден.' });
    const status = request.body.status || project.status;
    if (!canTransitionProject(project.status, status)) return response.status(409).json({ error: `Переход ${project.status} → ${status} недоступен.` });
    if (request.body.streetId && !(await database.street.findFirst({ where: { id: request.body.streetId, communityId } }))) return response.status(400).json({ error: 'Улица не принадлежит выбранному поселку.' });
    const values = {
      title: request.body.title?.trim() || project.title, description: request.body.description?.trim() || project.description,
      problem: request.body.problem?.trim() || project.problem, expectedResult: request.body.expectedResult?.trim() || project.expectedResult,
      category: request.body.category?.trim() || project.category, streetId: request.body.streetId === '' ? null : request.body.streetId || project.streetId,
      priority: request.body.priority || project.priority, responsible: request.body.responsible?.trim() || project.responsible,
      fundingSource: request.body.fundingSource?.trim() || project.fundingSource,
      budget: Number.isInteger(request.body.budget) && request.body.budget >= 0 ? request.body.budget : project.budget,
      startAt: request.body.startAt === null ? null : request.body.startAt ? new Date(request.body.startAt) : project.startAt,
      deadline: request.body.deadline === null ? null : request.body.deadline ? new Date(request.body.deadline) : project.deadline,
      beforePhotoUrl: request.body.beforePhotoUrl?.trim() || project.beforePhotoUrl, afterPhotoUrl: request.body.afterPhotoUrl?.trim() || project.afterPhotoUrl,
      resultNote: request.body.resultNote?.trim() || project.resultNote
    };
    if (status === 'COMPLETED') {
      const completionError = validateProjectCompletion({ ...values, tasks: project.tasks });
      if (completionError) return response.status(400).json({ error: completionError });
      values.progress = 100;
    }
    const updated = await database.project.update({ where: { id: project.id }, data: { status, ...values, history: status !== project.status ? { create: { actorId: request.membership.userId, fromStatus: project.status, toStatus: status, comment: request.body.comment?.trim() || null } } : undefined }, include: projectInclude });
    await audit({ communityId, actorId: request.membership.userId, action: 'updated', entityType: 'Project', entityId: updated.id, before: project, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});

projectsRouter.post('/:projectId/updates', allowRoles(...projectWorkerRoles), async (request, response, next) => {
  try {
    const project = await database.project.findFirst({ where: { id: request.params.projectId, communityId: request.membership.communityId } });
    const progress = request.body.progress === '' || request.body.progress == null ? null : Number(request.body.progress);
    if (!project) return response.status(404).json({ error: 'Проект не найден.' });
    if (!request.body.message?.trim() || (progress !== null && (!Number.isInteger(progress) || progress < 0 || progress > 100))) return response.status(400).json({ error: 'Укажите сообщение и корректную готовность от 0 до 100%.' });
    const update = await database.$transaction(async transaction => {
      const created = await transaction.projectUpdate.create({ data: { projectId: project.id, authorId: request.membership.userId, message: request.body.message.trim(), progress, photoUrl: request.body.photoUrl?.trim() || null } });
      await transaction.project.update({ where: { id: project.id }, data: progress !== null ? { progress } : {} });
      return created;
    });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'published_update', entityType: 'Project', entityId: project.id, after: update });
    await notifyCommunity({ communityId: request.membership.communityId, kind: 'PROJECT_UPDATE', title: `Обновление проекта: ${project.title}`, body: update.message, projectId: project.id });
    response.status(201).json(update);
  } catch (error) { next(error); }
});

projectsRouter.post('/:projectId/tasks', allowRoles(...projectWorkerRoles), async (request, response, next) => {
  try {
    const project = await database.project.findFirst({ where: { id: request.params.projectId, communityId: request.membership.communityId }, include: { tasks: true } });
    if (!project) return response.status(404).json({ error: 'Проект не найден.' });
    if (!request.body.title?.trim()) return response.status(400).json({ error: 'Укажите название задачи.' });
    const task = await database.$transaction(async transaction => {
      const created = await transaction.projectTask.create({ data: { projectId: project.id, title: request.body.title.trim(), description: request.body.description?.trim() || null, responsible: request.body.responsible?.trim() || null, dueAt: request.body.dueAt ? new Date(request.body.dueAt) : null } });
      await transaction.project.update({ where: { id: project.id }, data: { progress: taskProgress([...project.tasks, created]) } });
      return created;
    });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'ProjectTask', entityId: task.id, after: task });
    response.status(201).json(task);
  } catch (error) { next(error); }
});

projectsRouter.patch('/:projectId/tasks/:taskId', allowRoles(...projectWorkerRoles), async (request, response, next) => {
  try {
    const project = await database.project.findFirst({ where: { id: request.params.projectId, communityId: request.membership.communityId }, include: { tasks: true } });
    const task = project?.tasks.find(item => item.id === request.params.taskId);
    if (!project || !task) return response.status(404).json({ error: 'Задача не найдена.' });
    const status = request.body.status || task.status;
    if (!canTransitionTask(task.status, status)) return response.status(409).json({ error: `Переход задачи ${task.status} → ${status} недоступен.` });
    const updated = await database.$transaction(async transaction => {
      const changed = await transaction.projectTask.update({ where: { id: task.id }, data: { status, responsible: request.body.responsible?.trim() || task.responsible, dueAt: request.body.dueAt ? new Date(request.body.dueAt) : task.dueAt, completedAt: status === 'DONE' ? new Date() : null } });
      const tasks = project.tasks.map(item => item.id === changed.id ? changed : item);
      await transaction.project.update({ where: { id: project.id }, data: { progress: taskProgress(tasks) } });
      return changed;
    });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'updated', entityType: 'ProjectTask', entityId: updated.id, before: task, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});
