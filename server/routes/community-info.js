import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';

export const communityInfoRouter = Router();
const editorRoles = ['assistant_chairman', 'chairman', 'administrator'];

communityInfoRouter.get('/', async (request, response, next) => {
  try {
    const communityId = request.membership.communityId;
    const community = await database.community.findUnique({ where: { id: communityId }, select: { id: true, name: true, address: true } });
    const [contacts, articles, documents] = await Promise.all([
      database.serviceContact.findMany({ where: { communityId }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] }),
      database.knowledgeArticle.findMany({ where: { communityId, published: true }, orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] }),
      database.communityDocument.findMany({ where: { communityId, published: true, type: { in: ['CHARTER', 'REGULATION', 'PLAN'] } }, orderBy: { title: 'asc' } })
    ]);
    response.json({ community, contacts, articles, documents });
  } catch (error) { next(error); }
});

communityInfoRouter.put('/details', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const community = await database.community.update({ where: { id: request.membership.communityId }, data: { address: request.body.address?.trim() || null } });
    await audit({ communityId: community.id, actorId: request.membership.userId, action: 'updated_community_details', entityType: 'Community', entityId: community.id, after: { address: community.address } });
    response.json(community);
  } catch (error) { next(error); }
});

communityInfoRouter.post('/contacts', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const { title, contactName, phone, email, note, sortOrder = 0 } = request.body;
    if (!title) return response.status(400).json({ error: 'Укажите назначение контакта.' });
    const contact = await database.serviceContact.create({ data: { communityId: request.membership.communityId, title, contactName, phone, email, note, sortOrder: Number(sortOrder) } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'ServiceContact', entityId: contact.id, after: contact });
    response.status(201).json(contact);
  } catch (error) { next(error); }
});

communityInfoRouter.post('/articles', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const { type, title, content, sortOrder = 0 } = request.body;
    if (!['ONBOARDING', 'FAQ', 'RULE'].includes(type) || !title || !content) return response.status(400).json({ error: 'Укажите тип, заголовок и текст инструкции.' });
    const article = await database.knowledgeArticle.create({ data: { communityId: request.membership.communityId, type, title, content, sortOrder: Number(sortOrder) } });
    response.status(201).json(article);
  } catch (error) { next(error); }
});

communityInfoRouter.post('/documents', allowRoles(...editorRoles), async (request, response, next) => {
  try {
    const { type, title, url, description } = request.body;
    if (!['CHARTER', 'REGULATION', 'CONTRACT', 'PLAN', 'OTHER'].includes(type) || !title || !url) return response.status(400).json({ error: 'Укажите тип, название и ссылку на документ.' });
    const document = await database.communityDocument.create({ data: { communityId: request.membership.communityId, type, title, url, description } });
    response.status(201).json(document);
  } catch (error) { next(error); }
});
