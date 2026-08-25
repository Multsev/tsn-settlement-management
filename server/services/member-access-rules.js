export const assignableRoles = ['resident', 'owner', 'assistant_chairman', 'board_member', 'chairman', 'administrator'];

export function canManageRole(actorRole, targetRole) {
  if (actorRole === 'administrator') return assignableRoles.includes(targetRole);
  return actorRole === 'chairman' && targetRole !== 'administrator' && assignableRoles.includes(targetRole);
}

export function membershipState(membership) {
  if (membership.suspendedAt) return 'SUSPENDED';
  if (membership.approvedAt) return 'ACTIVE';
  return 'PENDING';
}

export function validPassword(password) {
  return typeof password === 'string' && password.length >= 10 && /[A-Za-zА-Яа-я]/.test(password) && /\d/.test(password);
}
