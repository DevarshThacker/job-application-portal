import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // CSRF defence in depth: state-changing requests carrying an Origin must come from an allowed origin.
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    // Allowed: configured origins, or same-origin (Origin host == Host header, e.g. behind ALB/nginx).
    let sameOrigin = false;
    try { sameOrigin = !!origin && new URL(origin).host === req.headers.host; } catch { /* malformed Origin */ }
    if (origin && !sameOrigin && !config.corsOrigins.includes(origin)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Origin not allowed' } });
    }
    next();
  });

  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
