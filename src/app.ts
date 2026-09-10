import cors from 'cors';
import express, {Express} from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import {RuntimeAppConfig} from './config';
import {RouteDefinition} from './presentation/http/base/base.routes';
import {createErrorHandler, createNotFoundHandler, createRequestLogger} from './presentation/http/middleware/http.middleware';
import {createOpenApiDocument} from './presentation/http/openapi';
import { LoggerService } from 'infrastructure/logging/logger.interface';

export interface AppConfig {
  readonly config: RuntimeAppConfig;
  readonly logger: LoggerService;
  readonly routes: RouteDefinition[];
}

export const createApp = ({config, logger, routes}: AppConfig): Express => {
  const app = express();
  const prefix = config.server.apiPrefix;

  // global middlewares
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(createRequestLogger(logger));
  app.use(express.json({limit: '1mb'}));

  // routes definitions
  for (const route of routes) {
    app.use(`${prefix}${route.path}`, route.router);
  }

  // documentation
  app.use(`${prefix}/docs`, swaggerUi.serve, swaggerUi.setup(createOpenApiDocument(config)));

  // error handling must remain last.
  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
};
