export const staffRoles = new Set(['board_member', 'chairman', 'administrator']);
export const chairmanRoles = new Set(['chairman', 'administrator']);

export const isStaff = (role) => staffRoles.has(role);
export const canManageCommunity = (role) => chairmanRoles.has(role);
