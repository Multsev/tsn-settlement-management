export const issueTransitions = {
  NEW: ['ACCEPTED', 'CLOSED'],
  ACCEPTED: ['PLANNED', 'IN_PROGRESS', 'CLOSED'],
  PLANNED: ['IN_PROGRESS', 'WAITING_CONTRACTOR', 'CLOSED'],
  IN_PROGRESS: ['WAITING_CONTRACTOR', 'COMPLETED'],
  WAITING_CONTRACTOR: ['IN_PROGRESS', 'COMPLETED'],
  COMPLETED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: []
};

export function canTransitionIssue(fromStatus, toStatus) {
  return fromStatus === toStatus || Boolean(issueTransitions[fromStatus]?.includes(toStatus));
}

export function validateIssueCompletion(status, { resultNote, afterPhotoUrl } = {}) {
  if (!['COMPLETED', 'CLOSED'].includes(status)) return null;
  if (!resultNote?.trim()) return 'Для завершения обращения укажите результат работ.';
  if (!afterPhotoUrl?.trim()) return 'Для завершения обращения добавьте ссылку на фото результата.';
  return null;
}
