import cors from 'cors';
import express, {Express} from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import {RuntimeAppConfig} from './config';
import {ILoggerService} from './infrastructure/logging/logger.interface';
import {RouteDefinition} from './presentation/http/base/base.routes';
import {HttpMiddleware} from './presentation/http/middleware/http.middleware';
import {OpenApiDocument} from './presentation/http/openapi';

export interface AppConfig {
  readonly config: RuntimeAppConfig;
  readonly logger: ILoggerService;
  readonly routes: RouteDefinition[];
}

export const createApp = ({config, logger, routes}: AppConfig): Express => {
  const app = express();
  const prefix = config.server.apiPrefix;
  const middleware = new HttpMiddleware(logger);
  const openApiDocument = new OpenApiDocument(config);

  // global middlewares
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(middleware.requestLogger);
  app.use(express.json({limit: '1mb'}));

  // routes definitions
  for (const route of routes) {
    app.use(`${prefix}${route.path}`, route.router);
  }

  // documentation
  app.use(`${prefix}/docs`, swaggerUi.serve, swaggerUi.setup(openApiDocument.create()));

  // error handling must remain last.
  app.use(middleware.notFound);
  app.use(middleware.errorHandler);

  return app;
};
