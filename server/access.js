export const staffRoles = new Set(['assistant_chairman', 'board_member', 'chairman', 'administrator']);
export const chairmanRoles = new Set(['chairman', 'administrator']);
export const proposalReviewRoles = new Set(['assistant_chairman', 'board_member', 'chairman', 'administrator']);

export const isStaff = (role) => staffRoles.has(role);
export const canManageCommunity = (role) => chairmanRoles.has(role);
export const canReviewProposals = (role) => proposalReviewRoles.has(role);
