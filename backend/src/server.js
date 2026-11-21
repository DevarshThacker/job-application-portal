import { config } from './config/index.js';
import { createApp } from './app.js';
import { prisma } from './config/db.js';
import { logger } from './utils/logger.js';

const app = createApp();
const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, storage: config.STORAGE_DRIVER }, 'API listening');
});

async function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
