import { Router } from 'express';
import { database } from '../database.js';
import { publicMemberProfile } from '../services/public-profile.js';

export const directoryRouter = Router();

directoryRouter.get('/', async (request, response, next) => {
  try {
    const skill = request.query.skill?.trim().toLocaleLowerCase('ru-RU');
    const street = request.query.street?.trim();
    const memberships = await database.membership.findMany({
      where: { communityId: request.membership.communityId, approvedAt: { not: null }, publicProfile: true, ...(skill ? { skills: { some: { skill: { normalized: { contains: skill } } } } } : {}), ...(street ? { properties: { some: { street: { contains: street, mode: 'insensitive' } } } } : {}) },
      include: { user: { select: { fullName: true, email: true } }, properties: { select: { street: true } }, skills: { include: { skill: true } } },
      orderBy: { user: { fullName: 'asc' } }
    });
    response.json(memberships.map(publicMemberProfile));
  } catch (error) { next(error); }
});
