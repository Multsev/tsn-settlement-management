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
export const loadRoadmap = (token, options) => request('/projects/roadmap', { token, ...options });
export const loadProjectAttention = (token, options) => request('/projects/attention', { token, ...options });
export const updateProject = (token, projectId, data, options) => request(`/projects/${projectId}`, { token, method: 'PATCH', body: data, ...options });
export const addProjectUpdate = (token, projectId, data, options) => request(`/projects/${projectId}/updates`, { token, method: 'POST', body: data, ...options });
export const createProjectTask = (token, projectId, data, options) => request(`/projects/${projectId}/tasks`, { token, method: 'POST', body: data, ...options });
export const updateProjectTask = (token, projectId, taskId, data, options) => request(`/projects/${projectId}/tasks/${taskId}`, { token, method: 'PATCH', body: data, ...options });
export const loadIssues = (token, options) => request('/issues', { token, ...options });
export const createIssue = (token, issue, options) => request('/issues', { token, method: 'POST', body: issue, ...options });
export const updateIssue = (token, issueId, issue, options) => request(`/issues/${issueId}`, { token, method: 'PATCH', body: issue, ...options });
export const loadStreets = (token, options) => request('/streets', { token, ...options });
export const createStreet = (token, street, options) => request('/streets', { token, method: 'POST', body: street, ...options });
export const loadProperties = (token, options) => request('/properties', { token, ...options });
export const createProperty = (token, property, options) => request('/properties', { token, method: 'POST', body: property, ...options });
export const requestPropertyAccess = (token, propertyId, note, options) => request(`/properties/${propertyId}/access-requests`, { token, method: 'POST', body: { note }, ...options });
export const reviewPropertyAccess = (token, requestId, status, options) => request(`/properties/access-requests/${requestId}`, { token, method: 'PATCH', body: { status }, ...options });
export const loadDirectory = (token, options) => request('/directory', { token, ...options });
export const loadListings = (token, options) => request('/listings', { token, ...options });
export const createListing = (token, listing, options) => request('/listings', { token, method: 'POST', body: listing, ...options });
export const loadCommunityInfo = (token, options) => request('/community-info', { token, ...options });
export const loadProposals = (token, options) => request('/proposals', { token, ...options });
export const openVote = (token, proposalId, settings, options) => request(`/proposals/${proposalId}/open-vote`, { token, method: 'POST', body: settings, ...options });
export const createProjectFromProposal = (token, proposalId, settings, options) => request(`/projects/from-proposal/${proposalId}`, { token, method: 'POST', body: settings, ...options });
export const loadMyFinances = (token, options) => request('/finances/me', { token, ...options });
export const loadFinanceOverview = (token, options) => request('/finances/overview', { token, ...options });
export const loadFinanceAdminOptions = (token, options) => request('/finances/admin-options', { token, ...options });
export const createCharge = (token, data, options) => request('/finances/charges', { token, method: 'POST', body: data, ...options });
export const recordPayment = (token, data, options) => request('/finances/payments', { token, method: 'POST', body: data, ...options });
export const createExpense = (token, data, options) => request('/finances/expenses', { token, method: 'POST', body: data, ...options });
export const createFundraiser = (token, data, options) => request('/finances/fundraisers', { token, method: 'POST', body: data, ...options });
export const contributeToFundraiser = (token, fundraiserId, amount, options) => request(`/finances/fundraisers/${fundraiserId}/contributions`, { token, method: 'POST', body: { amount }, ...options });
export const loadDecisions = (token, options) => request('/decisions', { token, ...options });
export const createDecision = (token, data, options) => request('/decisions', { token, method: 'POST', body: data, ...options });
export const updateDecision = (token, decisionId, data, options) => request(`/decisions/${decisionId}`, { token, method: 'PATCH', body: data, ...options });
export const loadDocuments = (token, options) => request('/documents', { token, ...options });
export const createDocument = (token, data, options) => request('/documents', { token, method: 'POST', body: data, ...options });
export const loadContractors = (token, options) => request('/contractors', { token, ...options });
export const createContractor = (token, data, options) => request('/contractors', { token, method: 'POST', body: data, ...options });
export const updateContractor = (token, contractorId, data, options) => request(`/contractors/${contractorId}`, { token, method: 'PATCH', body: data, ...options });
export const linkContractorProject = (token, contractorId, data, options) => request(`/contractors/${contractorId}/projects`, { token, method: 'POST', body: data, ...options });
