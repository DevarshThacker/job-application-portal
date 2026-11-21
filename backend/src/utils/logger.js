import pino from 'pino';
import { config } from '../config/index.js';

// JSON to stdout: directly collectable by CloudWatch agent / journald.
export const logger = pino({
  level: config.isTest ? 'silent' : config.LOG_LEVEL,
  base: { service: 'job-portal-api', env: config.NODE_ENV },
  redact: ['req.headers.cookie', 'req.headers.authorization'],
});
