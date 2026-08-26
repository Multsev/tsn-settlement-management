const key = 'tsn-management.session';
const legacyKey = 'prozor.session';

export function readSession(storage = sessionStorage) {
  try {
    const current = storage.getItem(key);
    if (current) return JSON.parse(current);
    const legacy = storage.getItem(legacyKey);
    if (!legacy) return null;
    storage.setItem(key, legacy);
    storage.removeItem(legacyKey);
    return JSON.parse(legacy);
  } catch { return null; }
}

export function saveSession(session, storage = sessionStorage) {
  storage.setItem(key, JSON.stringify(session));
}

export function clearSession(storage = sessionStorage) {
  storage.removeItem(key);
  storage.removeItem(legacyKey);
}
