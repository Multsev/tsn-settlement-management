export const wasteCategories = ['HOUSEHOLD', 'GREEN', 'CONSTRUCTION', 'BULKY'];
export const scheduleStatuses = ['SCHEDULED', 'DELAYED', 'COMPLETED', 'CANCELLED'];
export const pickupTransitions = { PENDING: ['APPROVED', 'REJECTED'], APPROVED: ['SCHEDULED', 'REJECTED'], SCHEDULED: ['COMPLETED'], COMPLETED: [], REJECTED: [] };

export function canTransitionPickup(from, to) {
  return from === to || (pickupTransitions[from] || []).includes(to);
}
