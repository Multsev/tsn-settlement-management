import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { database } from '../database.js';

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
    const token = jwt.sign({ communityId: community.id, role: membership.role }, config.jwtSecret, { subject: user.id, expiresIn: '8h' });
    response.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email }, community: { id: community.id, name: community.name }, role: membership.role });
  } catch (error) { next(error); }
});
