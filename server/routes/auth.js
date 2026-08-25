import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { database } from '../database.js';
import { publicSession } from '../services/session-tokens.js';
import { validPassword } from '../services/member-access-rules.js';
import crypto from 'node:crypto';

export const authRouter = Router();

authRouter.post('/login', async (request, response, next) => {
  try {
    const { email, password, communitySlug } = request.body;
    if (!email || !password || !communitySlug) return response.status(400).json({ error: 'Укажите email, пароль и поселок.' });
    const user = await database.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return response.status(401).json({ error: 'Неверный email или пароль.' });
    const community = await database.community.findUnique({ where: { slug: communitySlug } });
    const membership = community && await database.membership.findUnique({ where: { userId_communityId: { userId: user.id, communityId: community.id } } });
    if (!membership?.approvedAt) return response.status(403).json({ error: 'Доступ к поселку еще не подтвержден.' });
    if (membership.suspendedAt) return response.status(403).json({ error: 'Доступ к поселку приостановлен.' });
    response.json(publicSession(user, { ...membership, community }));
  } catch (error) { next(error); }
});

authRouter.post('/accept-invitation', async (request, response, next) => {
  try {
    const { token, fullName, password } = request.body;
    if (!token || !fullName?.trim() || !validPassword(password)) return response.status(400).json({ error: 'Укажите имя и пароль не короче 10 символов с буквами и цифрами.' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await database.membershipInvitation.findUnique({ where: { tokenHash }, include: { community: true } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return response.status(410).json({ error: 'Приглашение недействительно или истекло.' });
    const result = await database.$transaction(async transaction => {
      const user = await transaction.user.upsert({ where: { email: invitation.email }, update: { fullName: fullName.trim(), passwordHash: await bcrypt.hash(password, 12) }, create: { email: invitation.email, fullName: fullName.trim(), passwordHash: await bcrypt.hash(password, 12) } });
      const membership = await transaction.membership.upsert({ where: { userId_communityId: { userId: user.id, communityId: invitation.communityId } }, update: { role: invitation.role, approvedAt: new Date(), suspendedAt: null }, create: { userId: user.id, communityId: invitation.communityId, role: invitation.role, approvedAt: new Date() }, include: { community: true } });
      await transaction.membershipInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      return { user, membership };
    });
    response.status(201).json(publicSession(result.user, result.membership));
  } catch (error) { next(error); }
});
