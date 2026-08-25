import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { dispatchScheduledAnnouncements } from '../services/notification-delivery.js';

export const announcementsRouter = Router();
const editorRoles = ['chairman', 'administrator'];
const priorities = ['NORMAL', 'IMPORTANT', 'EMERGENCY'];
const validDate = value => !Number.isNaN(value.getTime());

announcementsRouter.get('/', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const canSeeAll = editorRoles.includes(request.membership.role) && request.query.all === '1';
    const now = new Date();
    const where = canSeeAll ? { communityId } : { communityId, published: true, startsAt: { lte: now }, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] };
    response.json(await database.announcement.findMany({ where, orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }] }));
  } catch (error) { next(error); }
});

announcementsRouter.post('/', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const { title, content, priority = 'NORMAL', startsAt, expiresAt, published = true } = request.body;
    const startDate = startsAt ? new Date(startsAt) : new Date();
    const expiryDate = expiresAt ? new Date(expiresAt) : null;
    if (!title?.trim() || !content?.trim() || !priorities.includes(priority)) return response.status(400).json({ error: 'Укажите название, текст и приоритет объявления.' });
    if (!validDate(startDate) || (expiryDate && (!validDate(expiryDate) || expiryDate <= startDate))) return response.status(400).json({ error: 'Срок объявления должен завершаться после даты начала.' });
    const announcement = await database.announcement.create({ data: { communityId: request.membership.communityId, authorId: request.membership.userId, title: title.trim(), content: content.trim(), priority, startsAt: startDate, expiresAt: expiryDate, published } });
    if (announcement.published && announcement.startsAt <= new Date()) await dispatchScheduledAnnouncements();
    await audit({ communityId: announcement.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Announcement', entityId: announcement.id, after: announcement });
    response.status(201).json(announcement);
  } catch (error) { next(error); }
});

announcementsRouter.patch('/:announcementId', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const announcement = await database.announcement.findFirst({ where: { id: request.params.announcementId, communityId: request.membership.communityId } });
    if (!announcement) return response.status(404).json({ error: 'Объявление не найдено.' });
    const priority = request.body.priority || announcement.priority;
    const startsAt = request.body.startsAt ? new Date(request.body.startsAt) : announcement.startsAt;
    const expiresAt = request.body.expiresAt === null ? null : request.body.expiresAt ? new Date(request.body.expiresAt) : announcement.expiresAt;
    if (!priorities.includes(priority) || !validDate(startsAt) || (expiresAt && (!validDate(expiresAt) || expiresAt <= startsAt))) return response.status(400).json({ error: 'Проверьте приоритет и срок объявления.' });
    const updated = await database.announcement.update({ where: { id: announcement.id }, data: { title: request.body.title?.trim() || announcement.title, content: request.body.content?.trim() || announcement.content, priority, startsAt, expiresAt, published: request.body.published ?? announcement.published } });
    if (!announcement.published && updated.published && updated.startsAt <= new Date()) await dispatchScheduledAnnouncements();
    await audit({ communityId: updated.communityId, actorId: request.membership.userId, action: 'updated', entityType: 'Announcement', entityId: updated.id, before: announcement, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});
