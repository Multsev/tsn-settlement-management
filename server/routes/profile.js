import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { publicMemberProfile } from '../services/public-profile.js';

export const profileRouter = Router();

const includeProfile = { user: { select: { fullName: true, email: true } }, properties: { select: { street: true } }, skills: { include: { skill: true } } };

profileRouter.get('/me', async (request, response, next) => {
  try {
    const membership = await database.membership.findUnique({ where: { id: request.membership.id }, include: includeProfile });
    response.json({ ...publicMemberProfile(membership), publicProfile: membership.publicProfile, publicPhone: membership.publicPhone, publicEmail: membership.publicEmail, contactPhone: membership.contactPhone, role: membership.role });
  } catch (error) { next(error); }
});

profileRouter.put('/me', async (request, response, next) => {
  try {
    const { publicProfile = false, publicPhone = false, publicEmail = false, contactPhone, skills = [] } = request.body;
    if (!Array.isArray(skills) || skills.some(skill => typeof skill.name !== 'string' || !skill.name.trim())) return response.status(400).json({ error: 'Навыки должны содержать непустые названия.' });
    const communityId = request.membership.communityId;
    const normalizedSkills = skills.map(skill => ({ name: skill.name.trim(), normalized: skill.name.trim().toLocaleLowerCase('ru-RU'), isPublic: skill.isPublic !== false }));
    const membership = await database.$transaction(async transaction => {
      await transaction.memberSkill.deleteMany({ where: { membershipId: request.membership.id } });
      for (const skill of normalizedSkills) {
        const storedSkill = await transaction.skill.upsert({ where: { communityId_normalized: { communityId, normalized: skill.normalized } }, update: {}, create: { communityId, name: skill.name, normalized: skill.normalized } });
        await transaction.memberSkill.create({ data: { membershipId: request.membership.id, skillId: storedSkill.id, isPublic: skill.isPublic } });
      }
      return transaction.membership.update({ where: { id: request.membership.id }, data: { publicProfile: Boolean(publicProfile), publicPhone: Boolean(publicPhone), publicEmail: Boolean(publicEmail), contactPhone: contactPhone?.trim() || null }, include: includeProfile });
    });
    await audit({ communityId, actorId: request.membership.userId, action: 'updated_public_profile', entityType: 'Membership', entityId: membership.id, after: { publicProfile, publicPhone, publicEmail, skills: normalizedSkills } });
    response.json({ ...publicMemberProfile(membership), publicProfile: membership.publicProfile, publicPhone: membership.publicPhone, publicEmail: membership.publicEmail, contactPhone: membership.contactPhone });
  } catch (error) { next(error); }
});
