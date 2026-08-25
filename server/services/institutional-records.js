export const decisionTransitions = {
  ADOPTED: ['IN_PROGRESS', 'EXECUTED', 'CANCELLED'],
  IN_PROGRESS: ['ADOPTED', 'EXECUTED', 'CANCELLED'],
  EXECUTED: ['IN_PROGRESS'],
  CANCELLED: ['ADOPTED']
};

export const canTransitionDecision = (fromStatus, toStatus) => fromStatus === toStatus || Boolean(decisionTransitions[fromStatus]?.includes(toStatus));

export function validateDecisionExecution(status, executionNote) {
  return status === 'EXECUTED' && !executionNote?.trim() ? 'Для исполненного решения укажите результат исполнения.' : null;
}

export function validContractorRating(rating) {
  return Number.isInteger(rating) && rating >= 0 && rating <= 5;
}

export function isPublicDocumentUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

export function contractorPortfolio(projectLinks = []) {
  return {
    projects: projectLinks.length,
    contractTotal: projectLinks.reduce((sum, link) => sum + (link.contractAmount || 0), 0),
    completedProjects: projectLinks.filter(link => link.project?.status === 'COMPLETED').length
  };
}
