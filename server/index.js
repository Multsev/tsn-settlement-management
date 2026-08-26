import { app } from './app.js';
import { assertProductionConfig, config } from './config.js';
import { startBackgroundJobs } from './background-jobs.js';

assertProductionConfig();
const stopJobs = startBackgroundJobs();
const server = app.listen(config.port, () => console.log(`ТСН: Управление посёлком is listening on http://localhost:${config.port}`));

function shutdown(signal) {
  console.log(`${signal}: graceful shutdown started`);
  stopJobs();
  server.close(error => {
    if (error) { console.error(error); process.exitCode = 1; }
    process.exit();
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
