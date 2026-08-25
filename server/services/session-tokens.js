import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function createSessionToken(userId, membership) {
  return jwt.sign({ communityId: membership.communityId, role: membership.role }, config.jwtSecret, { subject: userId, expiresIn: '8h' });
}

export function publicSession(user, membership) {
  return {
    token: createSessionToken(user.id, membership),
    user: { id: user.id, fullName: user.fullName, email: user.email },
    community: { id: membership.community.id, name: membership.community.name, slug: membership.community.slug },
    role: membership.role,
    membershipId: membership.id
  };
}
