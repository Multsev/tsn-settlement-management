import { Router } from 'express';
import { audit } from '../audit.js';
import { canReviewProposals } from '../access.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { calculatePollResult } from '../services/voting-rules.js';

export const proposalsRouter = Router();

proposalsRouter.get('/', async (request, response, next) => {
  try {
    const proposals = await database.proposal.findMany({ where: { communityId: request.membership.communityId }, include: { poll: { include: { votes: true } }, project: true }, orderBy: { updatedAt: 'desc' } });
    response.json(proposals.map(proposal => ({ ...proposal, pollResult: proposal.poll && calculatePollResult(proposal.poll) })));
  } catch (error) { next(error); }
});

proposalsRouter.post('/', async (request, response, next) => {
  try {
    const { title, description, category, preliminaryBudget } = request.body;
    if (!title || !description || !category) return response.status(400).json({ error: 'Заполните название, описание и категорию инициативы.' });
    const proposal = await database.proposal.create({ data: { communityId: request.membership.communityId, authorId: request.membership.userId, title, description, category, preliminaryBudget: preliminaryBudget ? Number(preliminaryBudget) : null } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Proposal', entityId: proposal.id, after: proposal });
    response.status(201).json(proposal);
  } catch (error) { next(error); }
});

proposalsRouter.patch('/:proposalId/review', allowRoles('assistant_chairman', 'board_member', 'chairman', 'administrator'), async (request, response, next) => {
  try {
    const existing = await database.proposal.findFirst({ where: { id: request.params.proposalId, communityId: request.membership.communityId } });
    if (!existing) return response.status(404).json({ error: 'Инициатива не найдена.' });
    const proposal = await database.proposal.update({ where: { id: existing.id }, data: { status: 'REVIEW' } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'sent_to_review', entityType: 'Proposal', entityId: proposal.id, after: proposal });
    response.json(proposal);
  } catch (error) { next(error); }
});

proposalsRouter.post('/:proposalId/open-vote', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const { closesAt, quorumPercent = 30, approvalPercent = 60 } = request.body;
    if (!closesAt || new Date(closesAt) <= new Date()) return response.status(400).json({ error: 'Укажите будущую дату завершения голосования.' });
    if (quorumPercent < 1 || quorumPercent > 100 || approvalPercent < 1 || approvalPercent > 100) return response.status(400).json({ error: 'Пороги голосования должны быть от 1 до 100%.' });
    const communityId = request.membership.communityId;
    const proposal = await database.proposal.findFirst({ where: { id: request.params.proposalId, communityId } });
    if (!proposal || !['SUBMITTED', 'REVIEW'].includes(proposal.status)) return response.status(409).json({ error: 'Эта инициатива не может быть вынесена на голосование.' });
    const eligibleVoters = await database.membership.count({ where: { communityId, approvedAt: { not: null } } });
    const poll = await database.$transaction(async transaction => {
      const createdPoll = await transaction.poll.create({ data: { communityId, proposalId: proposal.id, eligibleVoters, closesAt: new Date(closesAt), quorumPercent: Number(quorumPercent), approvalPercent: Number(approvalPercent) } });
      await transaction.proposal.update({ where: { id: proposal.id }, data: { status: 'VOTING' } });
      return createdPoll;
    });
    await audit({ communityId, actorId: request.membership.userId, action: 'opened_vote', entityType: 'Poll', entityId: poll.id, after: poll });
    response.status(201).json(poll);
  } catch (error) { next(error); }
});
