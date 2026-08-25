export const projectTransitions = {
  IDEA: ['ESTIMATION', 'CANCELLED'],
  ESTIMATION: ['PLANNED', 'CANCELLED'],
  PLANNED: ['FUNDRAISING', 'IN_PROGRESS', 'PAUSED', 'CANCELLED'],
  FUNDRAISING: ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'CANCELLED'],
  IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['PLANNED', 'FUNDRAISING', 'IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['IN_PROGRESS'],
  CANCELLED: ['IDEA']
};

export const taskTransitions = {
  TODO: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  IN_PROGRESS: ['TODO', 'DONE', 'CANCELLED'],
  DONE: ['IN_PROGRESS'],
  CANCELLED: ['TODO']
};

export const canTransitionProject = (fromStatus, toStatus) => fromStatus === toStatus || Boolean(projectTransitions[fromStatus]?.includes(toStatus));
export const canTransitionTask = (fromStatus, toStatus) => fromStatus === toStatus || Boolean(taskTransitions[fromStatus]?.includes(toStatus));

export function taskProgress(tasks = []) {
  const relevant = tasks.filter(task => task.status !== 'CANCELLED');
  if (!relevant.length) return 0;
  return Math.round((relevant.filter(task => task.status === 'DONE').length / relevant.length) * 100);
}

export function validateProjectCompletion({ resultNote, afterPhotoUrl, tasks = [] }) {
  if (!resultNote?.trim()) return 'Для завершения проекта опишите достигнутый результат.';
  if (!afterPhotoUrl?.trim()) return 'Для завершения проекта добавьте ссылку на фотографию результата.';
  if (tasks.some(task => !['DONE', 'CANCELLED'].includes(task.status))) return 'Перед завершением закройте или отмените все задачи проекта.';
  return null;
}

export function projectAttention(projects, now = new Date()) {
  const staleBoundary = new Date(now.getTime() - 14 * 86400000);
  return projects.map(project => ({
    id: project.id,
    overdue: Boolean(project.deadline && new Date(project.deadline) < now && !['COMPLETED', 'CANCELLED'].includes(project.status)),
    stale: !['COMPLETED', 'CANCELLED'].includes(project.status) && new Date(project.updates?.[0]?.createdAt || project.createdAt) < staleBoundary,
    overdueTasks: (project.tasks || []).filter(task => task.dueAt && new Date(task.dueAt) < now && !['DONE', 'CANCELLED'].includes(task.status)).length
  })).filter(item => item.overdue || item.stale || item.overdueTasks);
}

export function roadmapGroups(projects) {
  const groups = new Map();
  for (const project of projects) {
    const date = new Date(project.startAt || project.deadline || project.createdAt);
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${year}-Q${quarter}`;
    if (!groups.has(key)) groups.set(key, { year, quarter, projects: [] });
    groups.get(key).projects.push(project);
  }
  return [...groups.values()].sort((a, b) => a.year - b.year || a.quarter - b.quarter);
}
