import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  emailWebhookUrl: process.env.EMAIL_WEBHOOK_URL || '',
  emailWebhookToken: process.env.EMAIL_WEBHOOK_TOKEN || ''
};

export function assertProductionConfig() {
  if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'development-only-secret-change-me') {
    throw new Error('JWT_SECRET must be set in production.');
  }
}
