import { Router } from 'express';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';

export const notificationsRouter = Router();

notificationsRouter.get('/preferences', async (request, response) => {
  const { notificationLevel, inAppNotifications, emailNotifications } = request.membership;
  response.json({ notificationLevel, inAppNotifications, emailNotifications });
});

notificationsRouter.put('/preferences', async (request, response, next) => {
  try {
    const { notificationLevel, inAppNotifications, emailNotifications } = request.body;
    if (!['ONLY_IMPORTANT', 'IMPORTANT_AND_PROJECTS', 'ALL'].includes(notificationLevel) || typeof inAppNotifications !== 'boolean' || typeof emailNotifications !== 'boolean') return response.status(400).json({ error: 'Укажите уровень и каналы уведомлений.' });
    const membership = await database.membership.update({ where: { id: request.membership.id }, data: { notificationLevel, inAppNotifications, emailNotifications } });
    response.json({ notificationLevel: membership.notificationLevel, inAppNotifications: membership.inAppNotifications, emailNotifications: membership.emailNotifications });
  } catch (error) { next(error); }
});

notificationsRouter.get('/email-deliveries', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    response.json(await database.emailDelivery.findMany({ where: { notification: { communityId: request.membership.communityId } }, select: { id: true, recipient: true, status: true, attempts: true, lastError: true, sentAt: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
  } catch (error) { next(error); }
});

notificationsRouter.get('/', async (request, response, next) => {
  try {
    if (!request.membership.inAppNotifications) return response.json({ unread: 0, items: [] });
    const items = await database.notification.findMany({ where: { membershipId: request.membership.id }, include: { announcement: { select: { priority: true } }, project: { select: { id: true, title: true } }, digest: { select: { id: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    response.json({ unread: items.filter(item => !item.readAt).length, items });
  } catch (error) { next(error); }
});

notificationsRouter.patch('/read-all', async (request, response, next) => {
  try {
    const result = await database.notification.updateMany({ where: { membershipId: request.membership.id, readAt: null }, data: { readAt: new Date() } });
    response.json({ updated: result.count });
  } catch (error) { next(error); }
});

notificationsRouter.patch('/:notificationId/read', async (request, response, next) => {
  try {
    const notification = await database.notification.findFirst({ where: { id: request.params.notificationId, membershipId: request.membership.id } });
    if (!notification) return response.status(404).json({ error: 'Уведомление не найдено.' });
    response.json(await database.notification.update({ where: { id: notification.id }, data: { readAt: notification.readAt || new Date() } }));
  } catch (error) { next(error); }
});
