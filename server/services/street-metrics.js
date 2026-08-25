export function streetMetrics(properties = []) {
  const charges = properties.flatMap(property => property.charges || []);
  const charged = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const paid = charges.flatMap(charge => charge.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
  return {
    properties: properties.length,
    occupied: properties.filter(property => property.membershipId).length,
    charged,
    paid,
    collectionRate: charged ? Math.min(100, Math.round((paid / charged) * 100)) : 0
  };
}
