import { config } from '../config.js';
import { database } from '../database.js';
import { wantsNotification } from './notification-rules.js';

export async function notifyCommunity({ communityId, kind, title, body, priority, announcementId, projectId, digestId }) {
  const memberships = await database.membership.findMany({ where: { communityId, approvedAt: { not: null } }, include: { user: { select: { email: true } } } });
  const recipients = memberships.filter(member => (member.inAppNotifications || member.emailNotifications) && wantsNotification(member.notificationLevel, kind, priority));
  if (!recipients.length) return [];
  return database.$transaction(recipients.map(member => database.notification.create({ data: {
    communityId, membershipId: member.id, kind, title, body, announcementId: announcementId || null, projectId: projectId || null, digestId: digestId || null,
    ...(member.emailNotifications ? { emailDelivery: { create: { recipient: member.user.email } } } : {})
  } })));
}

export async function dispatchScheduledAnnouncements(limit = 50) {
  const now = new Date();
  const announcements = await database.announcement.findMany({ where: { published: true, notifiedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, orderBy: { startsAt: 'asc' }, take: limit });
  const results = [];
  for (const announcement of announcements) {
    await notifyCommunity({ communityId: announcement.communityId, kind: 'ANNOUNCEMENT', priority: announcement.priority, title: announcement.title, body: announcement.content, announcementId: announcement.id });
    results.push(await database.announcement.update({ where: { id: announcement.id }, data: { notifiedAt: new Date() } }));
  }
  return results;
}

export async function dispatchPendingEmails(limit = 50) {
  if (!config.emailWebhookUrl) return [];
  const deliveries = await database.emailDelivery.findMany({ where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 3 } }, include: { notification: true }, orderBy: { createdAt: 'asc' }, take: limit });
  const results = [];
  for (const delivery of deliveries) {
    try {
      const response = await fetch(config.emailWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(config.emailWebhookToken ? { Authorization: `Bearer ${config.emailWebhookToken}` } : {}) }, body: JSON.stringify({ to: delivery.recipient, subject: delivery.notification.title, text: delivery.notification.body }) });
      if (!response.ok) throw new Error(`Email webhook returned ${response.status}`);
      results.push(await database.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', attempts: { increment: 1 }, sentAt: new Date(), lastError: null } }));
    } catch (error) {
      results.push(await database.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', attempts: { increment: 1 }, lastError: error.message } }));
    }
  }
  return results;
}
