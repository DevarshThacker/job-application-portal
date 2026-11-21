import multer from 'multer';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

 
export function errorHandler(err, req, res, _next) {
  let status = 500; let code = 'INTERNAL_ERROR'; let message = 'Something went wrong'; let details;
  if (err instanceof AppError) ({ status, code, message, details } = err);
  else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400; code = err.code;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { status = 409; code = 'CONFLICT'; message = 'A record with these details already exists'; }
    else if (err.code === 'P2025') { status = 404; code = 'NOT_FOUND'; message = 'Record not found'; }
    else if (err.code === 'P2003') { status = 409; code = 'CONFLICT'; message = 'Operation blocked by related records'; }
  } else if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_REQUEST'; message = 'Malformed JSON body'; }
  else if (err.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large'; }

  if (status >= 500) logger.error({ err, path: req.path }, 'unhandled error');
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}
