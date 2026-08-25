import { app } from './app.js';
import { assertProductionConfig, config } from './config.js';

assertProductionConfig();
app.listen(config.port, () => console.log(`Prozor API is listening on http://localhost:${config.port}`));
