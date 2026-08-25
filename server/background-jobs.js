import { database } from './database.js';
import { dispatchPendingEmails, dispatchScheduledAnnouncements } from './services/notification-delivery.js';
import { generateWeeklyDigest } from './services/weekly-digest.js';

async function generateMondayDigests() {
  if (new Date().getDay() !== 1) return;
  const communities = await database.community.findMany({ select: { id: true } });
  await Promise.all(communities.map(community => generateWeeklyDigest(community.id)));
}

export function startBackgroundJobs() {
  const runDigests = () => generateMondayDigests().catch(error => console.error('Digest job failed:', error));
  const runDelivery = () => Promise.all([dispatchScheduledAnnouncements(), dispatchPendingEmails()]).catch(error => console.error('Delivery job failed:', error));
  const digestTimer = setInterval(runDigests, 6 * 60 * 60 * 1000);
  const emailTimer = setInterval(runDelivery, 60 * 1000);
  digestTimer.unref();
  emailTimer.unref();
  void runDigests();
  void runDelivery();
  return () => { clearInterval(digestTimer); clearInterval(emailTimer); };
}
