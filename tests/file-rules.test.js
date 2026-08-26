import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteFile, canReadFile, parseAttachment } from '../server/services/file-rules.js';
import { checksum, createStorageKey, MAX_FILE_SIZE, validateUpload } from '../server/services/file-storage.js';

test('доступ к служебному файлу имеет только сотрудник', () => {
  assert.equal(canReadFile('resident', 'MANAGEMENT'), false);
  assert.equal(canReadFile('board_member', 'MANAGEMENT'), true);
  assert.equal(canReadFile('resident', 'COMMUNITY'), true);
});

test('житель удаляет только собственный неприкрепленный файл', () => {
  assert.equal(canDeleteFile({ role: 'resident', uploaderId: 'u1', userId: 'u1', attachments: 0 }), true);
  assert.equal(canDeleteFile({ role: 'resident', uploaderId: 'u1', userId: 'u1', attachments: 1 }), false);
  assert.equal(canDeleteFile({ role: 'chairman', uploaderId: 'u1', userId: 'u2', attachments: 2 }), true);
});

test('привязка принимает только поддерживаемую сущность с идентификатором', () => {
  assert.deepEqual(parseAttachment({ entityType: 'PROJECT', entityId: ' p1 ', label: ' Смета ' }), { entityType: 'PROJECT', entityId: 'p1', label: 'Смета' });
  assert.throws(() => parseAttachment({ entityType: 'USER', entityId: 'u1' }), /Некорректная/);
});

test('загрузка ограничена форматом и размером, ключ и checksum стабильны', () => {
  assert.equal(validateUpload({ mimetype: 'application/pdf', size: 1024 }), '');
  assert.match(validateUpload({ mimetype: 'application/x-sh', size: 10 }), /формат/);
  assert.match(validateUpload({ mimetype: 'application/pdf', size: MAX_FILE_SIZE + 1 }), /15 МБ/);
  assert.equal(checksum(Buffer.from('tsn-management')), 'f4e38cd818729c35fafb22b302b47fabe976cabf61a2d14217147dccae3bc7e1');
  assert.match(createStorageKey('community-1', 'Смета.PDF'), /^community-1\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.pdf$/);
});
