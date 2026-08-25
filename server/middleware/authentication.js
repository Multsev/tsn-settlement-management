import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { database } from '../database.js';

export async function requireMembership(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ error: 'Требуется авторизация.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const membership = await database.membership.findUnique({
      where: { userId_communityId: { userId: payload.sub, communityId: payload.communityId } },
      include: { user: true, community: true }
    });
    if (!membership || !membership.approvedAt) return response.status(403).json({ error: 'Доступ к поселку не подтвержден.' });
    if (membership.suspendedAt) return response.status(403).json({ error: 'Доступ к поселку приостановлен.' });
    request.membership = membership;
    next();
  } catch {
    return response.status(401).json({ error: 'Сессия недействительна или истекла.' });
  }
}

export const allowRoles = (...roles) => (request, response, next) => {
  if (!roles.includes(request.membership.role)) return response.status(403).json({ error: 'Недостаточно прав.' });
  next();
};
