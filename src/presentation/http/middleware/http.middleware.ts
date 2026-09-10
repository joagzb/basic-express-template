import {ErrorRequestHandler, RequestHandler, Response} from 'express';
import {LoggerService} from '../../../application/shared/logger.service';
import {AppError} from '../errors/app-error';

export const createNotFoundHandler =
  (): RequestHandler =>
  (request, _response, next): void => {
    next(new AppError(404, 'NOT_FOUND', `Route ${request.method} ${request.path} was not found`));
  };

export const createRequestLogger =
  (logger: LoggerService): RequestHandler =>
  (request, response, next): void => {
    const startedAt = process.hrtime.bigint();
    response.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info({method: request.method, path: request.path, statusCode: response.statusCode, durationMs}, 'HTTP request completed');
    });
    next();
  };

export const createErrorHandler =
  (logger: LoggerService): ErrorRequestHandler =>
  (error: unknown, request, response, _next): void => {
    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: error.timestamp,
          ...(error.details === undefined ? {} : {details: error.details}),
        },
      });
      return;
    }
    logger.error({error, method: request.method, path: request.path}, 'Unhandled request error');
    response.status(500).json({error: {code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', timestamp: new Date().toISOString()}});
  };
