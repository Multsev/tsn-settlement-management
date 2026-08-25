export function normalizedSearchQuery(value) {
  const query = String(value || '').trim().replace(/\s+/g, ' ');
  return query.length >= 2 && query.length <= 100 ? query : null;
}

export function groupedSearchResults(groups) {
  return Object.entries(groups).flatMap(([type, items]) => items.map(item => ({ ...item, type })));
}
