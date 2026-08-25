import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config.js';

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
]);

export function validateUpload(file) {
  if (!file) return 'Выберите файл.';
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) return 'Недопустимый формат файла.';
  if (!file.size || file.size > MAX_FILE_SIZE) return 'Размер файла должен быть не более 15 МБ.';
  return '';
}

const extension = name => path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
export const checksum = buffer => createHash('sha256').update(buffer).digest('hex');
export const createStorageKey = (communityId, name) => `${communityId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension(name)}`;

function s3Client() {
  return new S3Client({
    endpoint: config.s3Endpoint || undefined,
    region: config.s3Region,
    forcePathStyle: Boolean(config.s3Endpoint),
    credentials: { accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3SecretAccessKey }
  });
}

export async function storeFile(key, buffer, contentType) {
  if (config.storageProvider === 's3') {
    await s3Client().send(new PutObjectCommand({ Bucket: config.s3Bucket, Key: key, Body: buffer, ContentType: contentType }));
    return 's3';
  }
  const target = path.resolve(config.storageDirectory, key);
  if (!target.startsWith(`${config.storageDirectory}${path.sep}`)) throw new Error('Unsafe storage key.');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer, { flag: 'wx' });
  return 'local';
}

export async function loadFile(key, provider) {
  if (provider === 's3') {
    const result = await s3Client().send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }));
    return Buffer.from(await result.Body.transformToByteArray());
  }
  return readFile(path.resolve(config.storageDirectory, key));
}

export async function removeFile(key, provider) {
  if (provider === 's3') return s3Client().send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: key }));
  return unlink(path.resolve(config.storageDirectory, key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
