import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { isStaff } from '../access.js';
import { allowRoles } from '../middleware/authentication.js';
import { notifyCommunity } from '../services/notification-delivery.js';
import { canTransitionPickup, scheduleStatuses, wasteCategories } from '../services/waste-rules.js';
import { validCoordinates } from '../services/map-rules.js';

export const wasteRouter = Router();
const managers = ['chairman', 'administrator'];
const workers = ['assistant_chairman', 'board_member', 'chairman', 'administrator'];

wasteRouter.get('/', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const [rules, sites, schedules, requests] = await Promise.all([
      database.wasteRule.findMany({ where: { communityId }, orderBy: { category: 'asc' } }),
      database.wasteSite.findMany({ where: { communityId }, orderBy: { title: 'asc' } }),
      database.wasteSchedule.findMany({ where: { communityId, scheduledAt: { gte: new Date(Date.now() - 30 * 86400000) } }, include: { site: { select: { title: true, address: true } } }, orderBy: { scheduledAt: 'asc' }, take: 100 }),
      database.extraPickupRequest.findMany({ where: { communityId, ...(!isStaff(request.membership.role) ? { membershipId: request.membership.id } : {}) }, include: isStaff(request.membership.role) ? { membership: { include: { user: { select: { fullName: true, email: true } } } } } : undefined, orderBy: { createdAt: 'desc' }, take: 100 })
    ]);
    response.json({ rules, sites, schedules, requests });
  } catch (error) { next(error); }
});

wasteRouter.put('/rules/:category', allowRoles(...managers), async (request, response, next) => {
  try {
    const category = request.params.category;
    if (!wasteCategories.includes(category) || !request.body.title?.trim() || !request.body.content?.trim()) return response.status(400).json({ error: 'Укажите категорию, название и правила.' });
    const rule = await database.wasteRule.upsert({ where: { communityId_category: { communityId: request.membership.communityId, category } }, update: { title: request.body.title.trim(), content: request.body.content.trim() }, create: { communityId: request.membership.communityId, category, title: request.body.title.trim(), content: request.body.content.trim() } });
    await audit({ communityId: rule.communityId, actorId: request.membership.userId, action: 'updated', entityType: 'WasteRule', entityId: rule.id, after: rule });
    response.json(rule);
  } catch (error) { next(error); }
});

wasteRouter.post('/sites', allowRoles(...managers), async (request, response, next) => {
  try {
    const hasLocation = request.body.latitude !== '' && request.body.latitude != null;
    if (!request.body.title?.trim() || !request.body.address?.trim() || (hasLocation && !validCoordinates(request.body.latitude, request.body.longitude))) return response.status(400).json({ error: 'Укажите площадку, адрес и корректные координаты.' });
    const site = await database.wasteSite.create({ data: { communityId: request.membership.communityId, title: request.body.title.trim(), address: request.body.address.trim(), status: request.body.status?.trim() || 'Работает', capacity: request.body.capacity ? Number(request.body.capacity) : null, latitude: hasLocation ? Number(request.body.latitude) : null, longitude: hasLocation ? Number(request.body.longitude) : null } });
    await audit({ communityId: site.communityId, actorId: request.membership.userId, action: 'created', entityType: 'WasteSite', entityId: site.id, after: site });
    response.status(201).json(site);
  } catch (error) { next(error); }
});

wasteRouter.post('/schedules', allowRoles(...managers), async (request, response, next) => {
  try {
    const scheduledAt = new Date(request.body.scheduledAt);
    if (!wasteCategories.includes(request.body.category) || Number.isNaN(scheduledAt.getTime())) return response.status(400).json({ error: 'Укажите вид мусора и дату вывоза.' });
    const schedule = await database.wasteSchedule.create({ data: { communityId: request.membership.communityId, siteId: request.body.siteId || null, category: request.body.category, scheduledAt, contractor: request.body.contractor?.trim() || null, note: request.body.note?.trim() || null } });
    await audit({ communityId: schedule.communityId, actorId: request.membership.userId, action: 'created', entityType: 'WasteSchedule', entityId: schedule.id, after: schedule });
    response.status(201).json(schedule);
  } catch (error) { next(error); }
});

wasteRouter.patch('/schedules/:scheduleId', allowRoles(...workers), async (request, response, next) => {
  try {
    const schedule = await database.wasteSchedule.findFirst({ where: { id: request.params.scheduleId, communityId: request.membership.communityId } });
    if (!schedule) return response.status(404).json({ error: 'Вывоз не найден.' });
    if (!scheduleStatuses.includes(request.body.status)) return response.status(400).json({ error: 'Выберите статус вывоза.' });
    const updated = await database.wasteSchedule.update({ where: { id: schedule.id }, data: { status: request.body.status, scheduledAt: request.body.scheduledAt ? new Date(request.body.scheduledAt) : schedule.scheduledAt, note: request.body.note?.trim() || schedule.note } });
    if (updated.status === 'DELAYED') await notifyCommunity({ communityId: updated.communityId, kind: 'ANNOUNCEMENT', priority: 'IMPORTANT', title: 'Изменение графика вывоза мусора', body: updated.note || 'Дата вывоза была изменена.' });
    await audit({ communityId: updated.communityId, actorId: request.membership.userId, action: 'updated', entityType: 'WasteSchedule', entityId: updated.id, before: schedule, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});

wasteRouter.post('/pickup-requests', async (request, response, next) => {
  try {
    if (!wasteCategories.includes(request.body.category) || !request.body.address?.trim()) return response.status(400).json({ error: 'Укажите вид мусора и адрес.' });
    const preferredAt = request.body.preferredAt ? new Date(request.body.preferredAt) : null;
    if (preferredAt && Number.isNaN(preferredAt.getTime())) return response.status(400).json({ error: 'Проверьте желаемую дату.' });
    const pickup = await database.extraPickupRequest.create({ data: { communityId: request.membership.communityId, membershipId: request.membership.id, category: request.body.category, address: request.body.address.trim(), note: request.body.note?.trim() || null, preferredAt } });
    await audit({ communityId: pickup.communityId, actorId: request.membership.userId, action: 'created', entityType: 'ExtraPickupRequest', entityId: pickup.id, after: pickup });
    response.status(201).json(pickup);
  } catch (error) { next(error); }
});

wasteRouter.patch('/pickup-requests/:requestId', allowRoles(...workers), async (request, response, next) => {
  try {
    const pickup = await database.extraPickupRequest.findFirst({ where: { id: request.params.requestId, communityId: request.membership.communityId } });
    if (!pickup) return response.status(404).json({ error: 'Заявка не найдена.' });
    if (!canTransitionPickup(pickup.status, request.body.status)) return response.status(409).json({ error: `Переход ${pickup.status} → ${request.body.status} недоступен.` });
    const updated = await database.extraPickupRequest.update({ where: { id: pickup.id }, data: { status: request.body.status, reviewNote: request.body.reviewNote?.trim() || pickup.reviewNote } });
    await audit({ communityId: updated.communityId, actorId: request.membership.userId, action: 'updated', entityType: 'ExtraPickupRequest', entityId: updated.id, before: pickup, after: updated });
    response.json(updated);
  } catch (error) { next(error); }
});
