import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { notifyCommunity } from '../services/notification-delivery.js';
import { canRespondToSurvey, normalizedSurveyOptions, surveyResults } from '../services/survey-rules.js';

export const surveysRouter = Router();
const editors = ['board_member', 'chairman', 'administrator'];
const includeSurvey = { options: { orderBy: { sortOrder: 'asc' } }, responses: { select: { optionId: true, membershipId: true } } };
const publicSurvey = (survey, membershipId) => ({ ...survey, options: surveyResults(survey), responses: undefined, totalResponses: survey.responses.length, myOptionId: survey.responses.find(item => item.membershipId === membershipId)?.optionId || null, canRespond: canRespondToSurvey(survey), informational: true });

surveysRouter.get('/', async (request, response, next) => {
  try {
    const seesDrafts = editors.includes(request.membership.role);
    await database.survey.updateMany({ where: { communityId: request.membership.communityId, status: 'ACTIVE', closesAt: { lte: new Date() } }, data: { status: 'CLOSED' } });
    const surveys = await database.survey.findMany({ where: { communityId: request.membership.communityId, ...(seesDrafts ? {} : { status: { in: ['ACTIVE', 'CLOSED'] } }) }, include: includeSurvey, orderBy: { createdAt: 'desc' } });
    response.json(surveys.map(item => publicSurvey(item, request.membership.id)));
  } catch (error) { next(error); }
});

surveysRouter.post('/', allowRoles(...editors), async (request, response, next) => {
  try {
    const options = normalizedSurveyOptions(request.body.options);
    if (!request.body.title?.trim() || options.length < 2 || options.length > 10) return response.status(400).json({ error: 'Укажите вопрос и от 2 до 10 разных вариантов ответа.' });
    const closesAt = request.body.closesAt ? new Date(request.body.closesAt) : null;
    if (closesAt && (Number.isNaN(closesAt.getTime()) || closesAt <= new Date())) return response.status(400).json({ error: 'Дата завершения должна быть в будущем.' });
    const survey = await database.survey.create({ data: { communityId: request.membership.communityId, title: request.body.title.trim(), description: request.body.description?.trim() || null, closesAt, options: { create: options.map((label, sortOrder) => ({ label, sortOrder })) } }, include: includeSurvey });
    await audit({ communityId: survey.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Survey', entityId: survey.id, after: { title: survey.title, options } });
    response.status(201).json(publicSurvey(survey, request.membership.id));
  } catch (error) { next(error); }
});

surveysRouter.patch('/:surveyId/status', allowRoles(...editors), async (request, response, next) => {
  try {
    const survey = await database.survey.findFirst({ where: { id: request.params.surveyId, communityId: request.membership.communityId }, include: includeSurvey });
    if (!survey) return response.status(404).json({ error: 'Опрос не найден.' });
    const status = request.body.status;
    const valid = (survey.status === 'DRAFT' && status === 'ACTIVE') || (survey.status === 'ACTIVE' && status === 'CLOSED');
    if (!valid) return response.status(409).json({ error: `Переход ${survey.status} → ${status} недоступен.` });
    if (status === 'ACTIVE' && survey.closesAt && survey.closesAt <= new Date()) return response.status(400).json({ error: 'Срок опроса уже истек.' });
    const updated = await database.survey.update({ where: { id: survey.id }, data: { status, ...(status === 'ACTIVE' ? { opensAt: new Date() } : { closesAt: survey.closesAt || new Date() }) }, include: includeSurvey });
    if (status === 'ACTIVE') await notifyCommunity({ communityId: updated.communityId, kind: 'ACTION_REQUIRED', title: `Новый опрос: ${updated.title}`, body: 'Выберите один вариант. Опрос носит информационный характер.' });
    await audit({ communityId: updated.communityId, actorId: request.membership.userId, action: status === 'ACTIVE' ? 'published' : 'closed', entityType: 'Survey', entityId: updated.id, before: { status: survey.status }, after: { status } });
    response.json(publicSurvey(updated, request.membership.id));
  } catch (error) { next(error); }
});

surveysRouter.put('/:surveyId/response', async (request, response, next) => {
  try {
    const survey = await database.survey.findFirst({ where: { id: request.params.surveyId, communityId: request.membership.communityId }, include: includeSurvey });
    if (!survey) return response.status(404).json({ error: 'Опрос не найден.' });
    if (!canRespondToSurvey(survey)) return response.status(409).json({ error: 'Опрос сейчас не принимает ответы.' });
    if (!survey.options.some(option => option.id === request.body.optionId)) return response.status(400).json({ error: 'Выберите вариант этого опроса.' });
    await database.surveyResponse.upsert({ where: { surveyId_membershipId: { surveyId: survey.id, membershipId: request.membership.id } }, update: { optionId: request.body.optionId }, create: { surveyId: survey.id, optionId: request.body.optionId, membershipId: request.membership.id } });
    await audit({ communityId: survey.communityId, actorId: request.membership.userId, action: 'responded', entityType: 'Survey', entityId: survey.id, after: { optionId: request.body.optionId } });
    const updated = await database.survey.findUnique({ where: { id: survey.id }, include: includeSurvey });
    response.json(publicSurvey(updated, request.membership.id));
  } catch (error) { next(error); }
});
