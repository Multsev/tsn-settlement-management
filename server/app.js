import express from 'express';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { projectsRouter } from './routes/projects.js';
import { issuesRouter } from './routes/issues.js';
import { requireMembership } from './middleware/authentication.js';

export const app = express();
app.use(express.json());
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/dashboard', requireMembership, dashboardRouter);
app.use('/api/projects', requireMembership, projectsRouter);
app.use('/api/issues', requireMembership, issuesRouter);
app.use((error, _request, response, _next) => { console.error(error); response.status(500).json({ error: 'Внутренняя ошибка сервера.' }); });
