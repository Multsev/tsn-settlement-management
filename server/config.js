import 'dotenv/config';
import path from 'node:path';

export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  emailWebhookUrl: process.env.EMAIL_WEBHOOK_URL || '',
  emailWebhookToken: process.env.EMAIL_WEBHOOK_TOKEN || '',
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  storageDirectory: path.resolve(process.env.STORAGE_LOCAL_DIR || 'storage/uploads'),
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3Bucket: process.env.S3_BUCKET || '',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
};

export function assertProductionConfig() {
  if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'development-only-secret-change-me') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  if (config.storageProvider === 's3' && (!config.s3Bucket || !config.s3AccessKeyId || !config.s3SecretAccessKey)) throw new Error('S3 storage credentials and bucket must be configured.');
}
