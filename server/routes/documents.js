import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { isPublicDocumentUrl } from '../services/institutional-records.js';

export const documentsRouter = Router();
const editorRoles = ['assistant_chairman', 'board_member', 'chairman', 'administrator'];
const documentTypes = ['CHARTER', 'PROTOCOL', 'REGULATION', 'CONTRACT', 'PLAN', 'ESTIMATE', 'INVOICE', 'ACT', 'LETTER', 'RESPONSE', 'OTHER'];
const include = { project: { select: { id: true, title: true } }, decision: { select: { id: true, title: true } }, expense: { select: { id: true, description: true, amount: true } }, contractor: { select: { id: true, name: true } } };

documentsRouter.get('/', async (request, response, next) => {
  try {
    const where = { communityId: request.membership.communityId, published: true, ...(request.query.type ? { type: request.query.type } : {}), ...(request.query.projectId ? { projectId: request.query.projectId } : {}) };
    response.json(await database.communityDocument.findMany({ where, include, orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }] }));
  } catch (error) { next(error); }
});

documentsRouter.post('/', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const { type, title, url, description, documentDate, projectId, decisionId, expenseId, contractorId } = request.body;
    const communityId = request.membership.communityId;
    if (!documentTypes.includes(type) || !title?.trim() || !isPublicDocumentUrl(url)) return response.status(400).json({ error: 'Укажите тип, название и корректную http(s)-ссылку документа.' });
    const [project, decision, expense, contractor] = await Promise.all([
      projectId ? database.project.findFirst({ where: { id: projectId, communityId } }) : null,
      decisionId ? database.decision.findFirst({ where: { id: decisionId, communityId } }) : null,
      expenseId ? database.expense.findFirst({ where: { id: expenseId, communityId } }) : null,
      contractorId ? database.contractor.findFirst({ where: { id: contractorId, communityId } }) : null
    ]);
    if ((projectId && !project) || (decisionId && !decision) || (expenseId && !expense) || (contractorId && !contractor)) return response.status(400).json({ error: 'Один из связанных объектов не принадлежит поселку.' });
    const document = await database.communityDocument.create({ data: { communityId, uploadedById: request.membership.userId, type, title: title.trim(), url, description: description?.trim() || null, documentDate: documentDate ? new Date(documentDate) : null, projectId: projectId || null, decisionId: decisionId || null, expenseId: expenseId || null, contractorId: contractorId || null }, include });
    await audit({ communityId, actorId: request.membership.userId, action: 'created', entityType: 'CommunityDocument', entityId: document.id, after: document });
    response.status(201).json(document);
  } catch (error) { next(error); }
});
