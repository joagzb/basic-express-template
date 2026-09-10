import cors from 'cors';
import express, {Express} from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import {AuthService} from '../../application/auth/auth.service';
import {LoggerService} from '../../application/shared/logger.service';
import {UserService} from '../../application/users/user.service';
import {RuntimeAppConfig} from '../../config';
import {AccessTokenService} from '../../domain/auth/auth';
import {AuthController} from './auth/auth.controller';
import {AuthRoutes} from './auth/auth.routes';
import {AuthenticationMiddleware} from './auth/authentication.middleware';
import {HealthController} from './health/health.controller';
import {HealthRoutes} from './health/health.routes';
import {createErrorHandler, createNotFoundHandler, createRequestLogger} from './middleware/http.middleware';
import {createOpenApiDocument} from './openapi';
import {UserController} from './users/user.controller';
import {UserRoutes} from './users/user.routes';

export interface AppDependencies {
  readonly config: RuntimeAppConfig;
  readonly logger: LoggerService;
  readonly userService: UserService;
  readonly authService: AuthService;
  readonly accessTokenService: AccessTokenService;
}

export class App {
  public constructor(private readonly dependencies: AppDependencies) {}

  public create(): Express {
    const {config, logger} = this.dependencies;
    
    const app = express();

    app.disable('x-powered-by');
    app.use(helmet());
    app.use(cors());
    app.use(express.json({limit: '1mb'}));
    app.use(createRequestLogger(logger));
    this.initializeRoutes(app);
    app.use(`${config.server.apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(createOpenApiDocument(config)));
    app.use(createNotFoundHandler());
    app.use(createErrorHandler(logger));

    return app;
  }

  private initializeRoutes(app: Express): void {
    const {config, userService, authService, accessTokenService} = this.dependencies;
    const healthController = new HealthController();
    const userController = new UserController(userService);
    const authController = new AuthController(authService);
    const authentication = new AuthenticationMiddleware(accessTokenService);
    
    const routes: RouteDefinition[] = [
      new HealthRoutes(healthController).definition,
      new AuthRoutes(authController).definition,
      new UserRoutes(userController, authentication).definitions
    ];

    for (const route of routes) {
      app.use(`${config.server.apiPrefix}${route.path}`, route.router);
    }
  }
}

export const createApp = (dependencies: AppDependencies): Express => new App(dependencies).create();
