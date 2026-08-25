import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { notifyCommunity } from '../services/notification-delivery.js';
import { generateWeeklyDigest } from '../services/weekly-digest.js';

export const digestsRouter = Router();
const workerRoles = ['board_member', 'chairman', 'administrator'];

digestsRouter.get('/', async (request, response, next) => {
  try {
    const canSeeDrafts = workerRoles.includes(request.membership.role);
    response.json(await database.weeklyDigest.findMany({ where: { communityId: request.membership.communityId, ...(canSeeDrafts ? {} : { status: 'PUBLISHED' }) }, orderBy: { weekStart: 'desc' }, take: 52 }));
  } catch (error) { next(error); }
});

digestsRouter.post('/generate', allowRoles(...workerRoles), async (request, response, next) => {
  try {
    const digest = await generateWeeklyDigest(request.membership.communityId, request.body.referenceDate ? new Date(request.body.referenceDate) : new Date());
    response.status(201).json(digest);
  } catch (error) { next(error); }
});

digestsRouter.post('/:digestId/publish', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const digest = await database.weeklyDigest.findFirst({ where: { id: request.params.digestId, communityId: request.membership.communityId } });
    if (!digest) return response.status(404).json({ error: 'Дайджест не найден.' });
    if (digest.status === 'PUBLISHED') return response.status(409).json({ error: 'Дайджест уже опубликован.' });
    const published = await database.weeklyDigest.update({ where: { id: digest.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await notifyCommunity({ communityId: published.communityId, kind: 'DIGEST', title: published.title, body: 'Краткая сводка работ, финансов и действий за неделю.', digestId: published.id });
    await audit({ communityId: published.communityId, actorId: request.membership.userId, action: 'published', entityType: 'WeeklyDigest', entityId: published.id, after: published });
    response.json(published);
  } catch (error) { next(error); }
});
