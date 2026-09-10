import { ErrorRequestHandler, RequestHandler } from 'express';
import { ValidationError } from '../../../application/shared/validation';
import { LoggerService } from '../../../infrastructure/logging/logger.interface';
import { AppError } from '../errors/app-error';

export const createNotFoundHandler = (): RequestHandler => (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} was not found`));
};

export const createRequestLogger =
  (logger: LoggerService): RequestHandler =>
  (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info({method: req.method, path: req.path, statusCode: res.statusCode, durationMs}, 'HTTP request completed');
    });

    next();
  };

const buildErrorBody = (code: string, message: string, details?: unknown, timestamp?: string) => ({
  error: {
    code,
    message,
    timestamp: timestamp ?? new Date().toISOString(),
    ...(details !== undefined ? {details} : {}),
  },
});

export const createErrorHandler =
  (logger: LoggerService): ErrorRequestHandler =>
  (error, req, res, _next) => {
    if (isMalformedJsonError(error)) {
      res.status(400).json(buildErrorBody('INVALID_JSON', 'Request body contains malformed JSON'));
      return;
    }

    if (error instanceof ValidationError) {
      res.status(400).json(buildErrorBody(error.code, error.message, {issues: error.issues}));
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json(buildErrorBody(error.code, error.message, error.details, error.timestamp));
      return;
    }

    logger.error({error, method: req.method, path: req.path}, 'Unhandled request error');
    res.status(500).json(buildErrorBody('INTERNAL_ERROR', 'An unexpected error occurred'));
  };

const isMalformedJsonError = (error: unknown): boolean => {
  return error instanceof SyntaxError && 'status' in error && 'body' in error && (error as {status?: unknown}).status === 400;
};
