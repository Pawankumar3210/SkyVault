import app from '../../api/index';
import { loadConfig } from './config';

const config = loadConfig();
app.listen(config.port, '127.0.0.1', () => {
  console.info(`Sky Vault API (${config.mode}) listening on http://127.0.0.1:${config.port}`);
  if (config.problems.length) console.error(config.problems.join('\n'));
});
