import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { loadManagementSummary } from '../services/management-data.js';

export const managementDashboardRouter = Router();
const roles = ['board_member', 'chairman', 'administrator'];

managementDashboardRouter.get('/', allowRoles(...roles), async (request, response, next) => {
  try { response.json(await loadManagementSummary(request.membership.communityId)); } catch (error) { next(error); }
});

managementDashboardRouter.get('/reports', allowRoles(...roles), async (request, response, next) => {
  try { response.json(await database.managementReport.findMany({ where: { communityId: request.membership.communityId }, include: { generatedBy: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 24 })); } catch (error) { next(error); }
});

managementDashboardRouter.post('/reports', allowRoles('chairman', 'administrator'), async (request, response, next) => {
  try {
    const periodEnd = request.body.periodEnd ? new Date(request.body.periodEnd) : new Date();
    const periodStart = request.body.periodStart ? new Date(request.body.periodStart) : new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > periodEnd) return response.status(400).json({ error: 'Проверьте период отчета.' });
    const content = await loadManagementSummary(request.membership.communityId, periodEnd);
    const report = await database.managementReport.create({ data: { communityId: request.membership.communityId, generatedById: request.membership.userId, title: request.body.title?.trim() || `Отчет правления за ${periodEnd.toLocaleDateString('ru-RU')}`, periodStart, periodEnd, content } });
    await audit({ communityId: report.communityId, actorId: request.membership.userId, action: 'generated', entityType: 'ManagementReport', entityId: report.id, after: { title: report.title, periodStart, periodEnd } });
    response.status(201).json(report);
  } catch (error) { next(error); }
});
