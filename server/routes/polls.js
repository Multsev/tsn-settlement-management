import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { calculatePollResult } from '../services/voting-rules.js';

export const pollsRouter = Router();

pollsRouter.get('/:pollId', async (request, response, next) => {
  try {
    const poll = await database.poll.findFirst({ where: { id: request.params.pollId, communityId: request.membership.communityId }, include: { proposal: true, votes: true } });
    if (!poll) return response.status(404).json({ error: 'Голосование не найдено.' });
    response.json({ ...poll, result: calculatePollResult(poll), myVote: poll.votes.find(vote => vote.membershipId === request.membership.id)?.choice || null });
  } catch (error) { next(error); }
});

pollsRouter.post('/:pollId/votes', async (request, response, next) => {
  try {
    const choice = request.body.choice;
    if (!['SUPPORT', 'OPPOSE'].includes(choice)) return response.status(400).json({ error: 'Выберите «за» или «против».' });
    const poll = await database.poll.findFirst({ where: { id: request.params.pollId, communityId: request.membership.communityId }, include: { votes: true } });
    if (!poll) return response.status(404).json({ error: 'Голосование не найдено.' });
    if (calculatePollResult(poll).closed) return response.status(409).json({ error: 'Голосование завершено.' });
    const vote = await database.vote.upsert({ where: { pollId_membershipId: { pollId: poll.id, membershipId: request.membership.id } }, update: { choice }, create: { pollId: poll.id, membershipId: request.membership.id, choice } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'voted', entityType: 'Poll', entityId: poll.id, after: { choice } });
    response.json(vote);
  } catch (error) { next(error); }
});
