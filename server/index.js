import { app } from './app.js';
import { assertProductionConfig, config } from './config.js';
import { startBackgroundJobs } from './background-jobs.js';

assertProductionConfig();
startBackgroundJobs();
app.listen(config.port, () => console.log(`Prozor API is listening on http://localhost:${config.port}`));
