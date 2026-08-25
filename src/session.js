const key = 'prozor.session';

export function readSession(storage = sessionStorage) {
  try { return JSON.parse(storage.getItem(key)); } catch { return null; }
}

export function saveSession(session, storage = sessionStorage) {
  storage.setItem(key, JSON.stringify(session));
}

export function clearSession(storage = sessionStorage) {
  storage.removeItem(key);
}
