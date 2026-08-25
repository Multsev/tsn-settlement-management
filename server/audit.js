import { database } from './database.js';

export function audit({ communityId, actorId, action, entityType, entityId, before, after }) {
  return database.auditLog.create({ data: { communityId, actorId, action, entityType, entityId, before, after } });
}
