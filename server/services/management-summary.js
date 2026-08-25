const activeProjectStatuses = new Set(['PLANNED', 'FUNDRAISING', 'IN_PROGRESS', 'PAUSED']);
const closedIssueStatuses = new Set(['COMPLETED', 'CLOSED']);

function issueTopic(issue) {
  const text = `${issue.title} ${issue.description || ''}`.toLocaleLowerCase('ru-RU');
  if (/мусор|контейнер/.test(text)) return 'Мусор';
  if (/фонар|свет|освещ/.test(text)) return 'Освещение';
  if (/дорог|ям|проезд/.test(text)) return 'Дороги';
  if (/ворот|въезд|шлагбаум/.test(text)) return 'Въезды';
  return 'Прочее';
}

export function managementSummary({ charges = [], payments = [], expenses = [], projects = [], issues = [], now = new Date() }) {
  const totalCharged = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const received = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const debt = charges.reduce((sum, charge) => sum + Math.max(0, charge.amount - (charge.payments || []).reduce((paid, payment) => paid + payment.amount, 0)), 0);
  const activeProjects = projects.filter(project => activeProjectStatuses.has(project.status));
  const overdueProjects = activeProjects.filter(project => project.deadline && project.deadline < now && project.status !== 'COMPLETED');
  const overdueTasks = projects.flatMap(project => project.tasks || []).filter(task => !['DONE', 'CANCELLED'].includes(task.status) && task.dueAt && task.dueAt < now);
  const staleProjects = activeProjects.filter(project => !project.updates?.[0] || now - project.updates[0].createdAt > 14 * 86400000);
  const openIssues = issues.filter(issue => !closedIssueStatuses.has(issue.status));
  const unassignedIssues = openIssues.filter(issue => !issue.responsible || !issue.dueAt);
  const completedThisMonth = projects.filter(project => project.status === 'COMPLETED' && project.updatedAt.getFullYear() === now.getFullYear() && project.updatedAt.getMonth() === now.getMonth());
  const reserved = activeProjects.reduce((sum, project) => sum + Math.max(0, project.collected - project.spent), 0);
  const topics = Object.entries(issues.reduce((result, issue) => ({ ...result, [issueTopic(issue)]: (result[issueTopic(issue)] || 0) + 1 }), {})).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count);
  const risks = [
    ...overdueProjects.map(item => ({ type: 'PROJECT_OVERDUE', title: item.title, severity: 'HIGH' })),
    ...staleProjects.map(item => ({ type: 'PROJECT_STALE', title: item.title, severity: 'MEDIUM' })),
    ...unassignedIssues.map(item => ({ type: 'ISSUE_UNASSIGNED', title: `REQ-${item.number}: ${item.title}`, severity: 'MEDIUM' }))
  ];
  return { attention: { newIssues: issues.filter(issue => issue.status === 'NEW').length, staleProjects: staleProjects.length, overdueTasks: overdueTasks.length }, finances: { charged: totalCharged, received, spent, debt, balance: received - spent, reserved, collectionRate: totalCharged ? Math.min(100, Math.round((received / totalCharged) * 100)) : 0 }, projects: { active: activeProjects.length, overdue: overdueProjects.length, completedThisMonth: completedThisMonth.length }, issues: { open: openIssues.length, unassigned: unassignedIssues.length }, topics: topics.slice(0, 5), risks };
}
