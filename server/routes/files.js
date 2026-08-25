import { Router } from 'express';
import multer from 'multer';
import { audit } from '../audit.js';
import { isStaff } from '../access.js';
import { database } from '../database.js';
import { canDeleteFile, canReadFile, fileVisibilities, parseAttachment } from '../services/file-rules.js';
import { checksum, createStorageKey, loadFile, MAX_FILE_SIZE, removeFile, storeFile, validateUpload } from '../services/file-storage.js';

export const filesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });

async function validateAttachmentTarget(attachment, membership) {
  if (!attachment) return true;
  const where = { id: attachment.entityId, communityId: membership.communityId };
  if (attachment.entityType === 'ISSUE') {
    const issue = await database.issue.findFirst({ where });
    return Boolean(issue && (isStaff(membership.role) || issue.authorId === membership.userId));
  }
  if (attachment.entityType === 'COMMUNITY') return attachment.entityId === membership.communityId;
  if (!isStaff(membership.role)) return false;
  const models = { PROJECT: 'project', DOCUMENT: 'communityDocument', EXPENSE: 'expense', DECISION: 'decision', CONTRACTOR: 'contractor' };
  return Boolean(await database[models[attachment.entityType]].findFirst({ where }));
}

filesRouter.get('/', async (request, response, next) => {
  try {
    const where = {
      communityId: request.membership.communityId,
      ...(!isStaff(request.membership.role) ? { visibility: 'COMMUNITY' } : {}),
      ...(request.query.entityType && request.query.entityId ? { attachments: { some: { entityType: request.query.entityType, entityId: request.query.entityId } } } : {})
    };
    response.json(await database.storedFile.findMany({
      where,
      include: { uploadedBy: { select: { fullName: true } }, attachments: true },
      orderBy: { createdAt: 'desc' }
    }));
  } catch (error) { next(error); }
});

filesRouter.post('/', upload.single('file'), async (request, response, next) => {
  let stored = null;
  try {
    const validationError = validateUpload(request.file);
    if (validationError) return response.status(400).json({ error: validationError });
    const visibility = request.body.visibility || 'COMMUNITY';
    if (!fileVisibilities.has(visibility) || (visibility === 'MANAGEMENT' && !isStaff(request.membership.role))) return response.status(403).json({ error: 'Недоступный уровень доступа.' });
    let attachment;
    try { attachment = parseAttachment(request.body); } catch (error) { return response.status(400).json({ error: error.message }); }
    if (!await validateAttachmentTarget(attachment, request.membership)) return response.status(403).json({ error: 'Нельзя прикрепить файл к выбранному объекту.' });

    const key = createStorageKey(request.membership.communityId, request.file.originalname);
    const provider = await storeFile(key, request.file.buffer, request.file.mimetype);
    stored = { key, provider };
    const file = await database.storedFile.create({
      data: {
        communityId: request.membership.communityId,
        uploadedById: request.membership.userId,
        originalName: request.file.originalname.slice(0, 255),
        storageKey: key,
        provider,
        mimeType: request.file.mimetype,
        size: request.file.size,
        checksum: checksum(request.file.buffer),
        visibility,
        attachments: attachment ? { create: attachment } : undefined
      },
      include: { uploadedBy: { select: { fullName: true } }, attachments: true }
    });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'uploaded', entityType: 'StoredFile', entityId: file.id, after: { originalName: file.originalName, size: file.size, visibility: file.visibility, attachments: file.attachments } });
    response.status(201).json(file);
  } catch (error) {
    if (stored) await removeFile(stored.key, stored.provider).catch(() => {});
    if (error.code === 'LIMIT_FILE_SIZE') return response.status(400).json({ error: 'Размер файла должен быть не более 15 МБ.' });
    next(error);
  }
});

filesRouter.get('/:id/content', async (request, response, next) => {
  try {
    const file = await database.storedFile.findFirst({ where: { id: request.params.id, communityId: request.membership.communityId } });
    if (!file || !canReadFile(request.membership.role, file.visibility)) return response.status(404).json({ error: 'Файл не найден.' });
    const buffer = await loadFile(file.storageKey, file.provider);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', file.size);
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.send(buffer);
  } catch (error) { next(error); }
});

filesRouter.delete('/:id', async (request, response, next) => {
  try {
    const file = await database.storedFile.findFirst({ where: { id: request.params.id, communityId: request.membership.communityId }, include: { _count: { select: { attachments: true } } } });
    if (!file) return response.status(404).json({ error: 'Файл не найден.' });
    if (!canDeleteFile({ role: request.membership.role, uploaderId: file.uploadedById, userId: request.membership.userId, attachments: file._count.attachments })) return response.status(403).json({ error: 'Прикрепленный файл может удалить только правление.' });
    await database.storedFile.delete({ where: { id: file.id } });
    await removeFile(file.storageKey, file.provider);
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'deleted', entityType: 'StoredFile', entityId: file.id, before: { originalName: file.originalName, size: file.size } });
    response.status(204).end();
  } catch (error) { next(error); }
});
