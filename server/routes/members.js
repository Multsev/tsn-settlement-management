import crypto from 'node:crypto';
import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { allowRoles } from '../middleware/authentication.js';
import { assignableRoles, canManageRole, membershipState } from '../services/member-access-rules.js';

export const membersRouter = Router();
const managers = ['chairman', 'administrator'];

membersRouter.get('/', allowRoles(...managers), async (request, response, next) => {
  try {
    const [members, invitations] = await Promise.all([
      database.membership.findMany({ where: { communityId: request.membership.communityId }, include: { user: { select: { id: true, fullName: true, email: true } }, properties: { select: { id: true, number: true, street: true } } }, orderBy: { createdAt: 'desc' } }),
      database.membershipInvitation.findMany({ where: { communityId: request.membership.communityId, acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } })
    ]);
    response.json({ members: members.map(member => ({ ...member, state: membershipState(member) })), invitations });
  } catch (error) { next(error); }
});

membersRouter.post('/invitations', allowRoles(...managers), async (request, response, next) => {
  try {
    const email = request.body.email?.trim().toLowerCase();
    const role = request.body.role || 'resident';
    if (!/^\S+@\S+\.\S+$/.test(email || '') || !canManageRole(request.membership.role, role)) return response.status(400).json({ error: 'Проверьте email и доступную роль.' });
    const existingUser = await database.user.findUnique({ where: { email }, include: { memberships: { where: { communityId: request.membership.communityId } } } });
    if (existingUser?.memberships.length) return response.status(409).json({ error: 'Пользователь уже состоит в поселке.' });
    const token = crypto.randomBytes(32).toString('base64url');
    const invitation = await database.membershipInvitation.create({ data: { communityId: request.membership.communityId, invitedById: request.membership.userId, email, role, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'invited', entityType: 'MembershipInvitation', entityId: invitation.id, after: { email, role, expiresAt: invitation.expiresAt } });
    response.status(201).json({ id: invitation.id, email, role, expiresAt: invitation.expiresAt, token });
  } catch (error) { next(error); }
});

membersRouter.patch('/:membershipId', allowRoles(...managers), async (request, response, next) => {
  try {
    const target = await database.membership.findFirst({ where: { id: request.params.membershipId, communityId: request.membership.communityId }, include: { user: { select: { fullName: true, email: true } } } });
    if (!target) return response.status(404).json({ error: 'Участник не найден.' });
    const role = request.body.role ?? target.role;
    if (!assignableRoles.includes(role) || !canManageRole(request.membership.role, role) || (target.role === 'administrator' && request.membership.role !== 'administrator')) return response.status(403).json({ error: 'Эту роль назначить нельзя.' });
    const suspending = request.body.suspended === true;
    if (target.id === request.membership.id && (suspending || role !== target.role)) return response.status(409).json({ error: 'Нельзя изменить собственную роль или приостановить свой доступ.' });
    if (target.role === 'chairman' && (suspending || role !== 'chairman')) {
      const chairmen = await database.membership.count({ where: { communityId: target.communityId, role: 'chairman', approvedAt: { not: null }, suspendedAt: null } });
      if (chairmen <= 1) return response.status(409).json({ error: 'В поселке должен оставаться хотя бы один активный председатель.' });
    }
    const updated = await database.membership.update({ where: { id: target.id }, data: { role, approvedAt: request.body.approved === false ? null : request.body.approved === true ? target.approvedAt || new Date() : target.approvedAt, suspendedAt: request.body.suspended === false ? null : suspending ? new Date() : target.suspendedAt }, include: { user: { select: { id: true, fullName: true, email: true } }, properties: true } });
    await audit({ communityId: target.communityId, actorId: request.membership.userId, action: 'access_updated', entityType: 'Membership', entityId: target.id, before: { role: target.role, approvedAt: target.approvedAt, suspendedAt: target.suspendedAt }, after: { role: updated.role, approvedAt: updated.approvedAt, suspendedAt: updated.suspendedAt } });
    response.json({ ...updated, state: membershipState(updated) });
  } catch (error) { next(error); }
});
