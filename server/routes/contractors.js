import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { contractorPortfolio, validContractorRating } from '../services/institutional-records.js';

export const contractorsRouter = Router();
const editorRoles = ['board_member', 'chairman', 'administrator'];
const include = { projectLinks: { include: { project: { select: { id: true, title: true, status: true } } }, orderBy: { createdAt: 'desc' } }, documents: { select: { id: true, title: true, type: true, url: true } } };

contractorsRouter.get('/', async (request, response, next) => {
  try {
    const contractors = await database.contractor.findMany({ where: { communityId: request.membership.communityId }, include, orderBy: { name: 'asc' } });
    response.json(contractors.map(contractor => ({ ...contractor, portfolio: contractorPortfolio(contractor.projectLinks) })));
  } catch (error) { next(error); }
});

contractorsRouter.post('/', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const { name, contactName, phone, email, services, rating = 0, note } = request.body;
    if (!name?.trim() || !services?.trim() || !validContractorRating(Number(rating))) return response.status(400).json({ error: 'Укажите название, виды работ и рейтинг от 0 до 5.' });
    const contractor = await database.contractor.create({ data: { communityId: request.membership.communityId, name: name.trim(), contactName: contactName?.trim() || null, phone: phone?.trim() || null, email: email?.trim() || null, services: services.trim(), rating: Number(rating), note: note?.trim() || null } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Contractor', entityId: contractor.id, after: contractor });
    response.status(201).json(contractor);
  } catch (error) { next(error); }
});

contractorsRouter.patch('/:contractorId', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const contractor = await database.contractor.findFirst({ where: { id: request.params.contractorId, communityId: request.membership.communityId } });
    if (!contractor) return response.status(404).json({ error: 'Подрядчик не найден.' });
    const rating = request.body.rating == null ? contractor.rating : Number(request.body.rating);
    if (!validContractorRating(rating)) return response.status(400).json({ error: 'Рейтинг должен быть от 0 до 5.' });
    const updated = await database.contractor.update({ where: { id: contractor.id }, data: { name: request.body.name?.trim() || contractor.name, services: request.body.services?.trim() || contractor.services, contactName: request.body.contactName?.trim() || contractor.contactName, phone: request.body.phone?.trim() || contractor.phone, email: request.body.email?.trim() || contractor.email, rating, note: request.body.note?.trim() || contractor.note }, include });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'updated', entityType: 'Contractor', entityId: updated.id, before: contractor, after: updated });
    response.json({ ...updated, portfolio: contractorPortfolio(updated.projectLinks) });
  } catch (error) { next(error); }
});

contractorsRouter.post('/:contractorId/projects', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const { projectId, role, contractNumber, contractAmount, warrantyUntil } = request.body;
    const [contractor, project] = await Promise.all([database.contractor.findFirst({ where: { id: request.params.contractorId, communityId } }), database.project.findFirst({ where: { id: projectId, communityId } })]);
    if (!contractor || !project || (contractAmount != null && (!Number.isInteger(contractAmount) || contractAmount < 0))) return response.status(400).json({ error: 'Укажите подрядчика, проект и корректную стоимость договора.' });
    const link = await database.projectContractor.upsert({ where: { projectId_contractorId: { projectId, contractorId: contractor.id } }, update: { role: role?.trim() || null, contractNumber: contractNumber?.trim() || null, contractAmount: contractAmount ?? null, warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null }, create: { projectId, contractorId: contractor.id, role: role?.trim() || null, contractNumber: contractNumber?.trim() || null, contractAmount: contractAmount ?? null, warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null } });
    await audit({ communityId, actorId: request.membership.userId, action: 'linked_to_project', entityType: 'Contractor', entityId: contractor.id, after: link });
    response.status(201).json(link);
  } catch (error) { next(error); }
});
