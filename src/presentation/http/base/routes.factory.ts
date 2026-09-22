import {AuthService} from '../../../application/auth/auth.service';
import {HealthService} from '../../../application/health/health.service';
import {UserService} from '../../../application/users/user.service';
import {ITokenService} from '../../../domain/auth/auth';
import {AuthController} from '../auth/auth.controller';
import {AuthRoutes} from '../auth/auth.routes';
import {AuthenticationMiddleware} from '../auth/authentication.middleware';
import {HealthController} from '../health/health.controller';
import {HealthRoutes} from '../health/health.routes';
import {UserController} from '../users/user.controller';
import {UserRoutes} from '../users/user.routes';
import {RouteDefinition} from './base.routes';

export interface RouteDependencies {
  readonly userService: UserService;
  readonly authService: AuthService;
  readonly healthService: HealthService;
  readonly accessTokenService: ITokenService;
}

export const createRoutes = (deps: RouteDependencies): RouteDefinition[] => {
  const authMiddleware = new AuthenticationMiddleware(deps.accessTokenService);

  return [
    new HealthRoutes(new HealthController(deps.healthService)).definition,
    new AuthRoutes(new AuthController(deps.authService), authMiddleware).definition,
    new UserRoutes(new UserController(deps.userService), authMiddleware).definition,
  ];
};
