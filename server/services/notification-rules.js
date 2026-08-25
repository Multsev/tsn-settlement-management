export function wantsNotification(level, kind, priority = 'NORMAL') {
  if (kind === 'DIGEST' || kind === 'ACTION_REQUIRED') return true;
  if (kind === 'PROJECT_UPDATE') return ['IMPORTANT_AND_PROJECTS', 'ALL'].includes(level);
  if (kind === 'ANNOUNCEMENT') return level === 'ALL' || ['IMPORTANT', 'EMERGENCY'].includes(priority);
  return false;
}

export function weekRange(reference = new Date()) {
  const start = new Date(reference);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start, end };
}

export function digestSummary({ projectUpdates = [], completedIssues = [], payments = [], activeProjects = [], openPolls = [] }) {
  return {
    results: [
      ...completedIssues.map(issue => issue.resultNote || issue.title),
      ...projectUpdates.filter(update => update.progress === 100).map(update => update.message)
    ],
    projectUpdates: projectUpdates.map(update => ({ project: update.project?.title, message: update.message, progress: update.progress })),
    collected: payments.reduce((sum, payment) => sum + payment.amount, 0),
    activeProjects: activeProjects.length,
    actionsRequired: openPolls.length
  };
}
