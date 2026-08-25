import { isStaff } from '../access.js';

export const attachmentTypes = new Set(['ISSUE', 'PROJECT', 'DOCUMENT', 'EXPENSE', 'DECISION', 'CONTRACTOR', 'COMMUNITY']);
export const fileVisibilities = new Set(['COMMUNITY', 'MANAGEMENT']);

export const canReadFile = (role, visibility) => visibility === 'COMMUNITY' || isStaff(role);
export const canDeleteFile = ({ role, uploaderId, userId, attachments }) => isStaff(role) || (uploaderId === userId && attachments === 0);

export function parseAttachment(body = {}) {
  if (!body.entityType && !body.entityId) return null;
  if (!attachmentTypes.has(body.entityType) || !body.entityId?.trim()) throw new Error('Некорректная привязка файла.');
  return { entityType: body.entityType, entityId: body.entityId.trim(), label: body.label?.trim() || null };
}
