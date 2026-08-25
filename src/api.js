const apiBaseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function request(path, { token, method = 'GET', body, fetcher = fetch } = {}) {
  const response = await fetcher(`${apiBaseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'Не удалось выполнить запрос.', response.status);
  return payload;
}

export const login = (credentials, options) => request('/auth/login', { method: 'POST', body: credentials, ...options });
export const loadDashboard = (token, options) => request('/dashboard', { token, ...options });
export const loadProjects = (token, options) => request('/projects', { token, ...options });
export const loadIssues = (token, options) => request('/issues', { token, ...options });
export const createIssue = (token, issue, options) => request('/issues', { token, method: 'POST', body: issue, ...options });
export const loadDirectory = (token, options) => request('/directory', { token, ...options });
export const loadListings = (token, options) => request('/listings', { token, ...options });
export const createListing = (token, listing, options) => request('/listings', { token, method: 'POST', body: listing, ...options });
