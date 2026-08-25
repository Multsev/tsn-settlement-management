import express from 'express';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { projectsRouter } from './routes/projects.js';
import { issuesRouter } from './routes/issues.js';
import { pollsRouter } from './routes/polls.js';
import { proposalsRouter } from './routes/proposals.js';
import { requireMembership } from './middleware/authentication.js';
import { config } from './config.js';

export const app = express();
app.use(express.json());
app.use((request, response, next) => {
  if (request.headers.origin === config.webOrigin) response.setHeader('Access-Control-Allow-Origin', config.webOrigin);
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  next();
});
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/dashboard', requireMembership, dashboardRouter);
app.use('/api/projects', requireMembership, projectsRouter);
app.use('/api/issues', requireMembership, issuesRouter);
app.use('/api/proposals', requireMembership, proposalsRouter);
app.use('/api/polls', requireMembership, pollsRouter);
app.use((error, _request, response, _next) => { console.error(error); response.status(500).json({ error: 'Внутренняя ошибка сервера.' }); });
