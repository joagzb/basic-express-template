import {BaseRoutes} from '../base/base.routes';
import {AuthController} from './auth.controller';
import {AuthenticationMiddleware} from './authentication.middleware';

export class AuthRoutes extends BaseRoutes<AuthController> {
  public constructor(
    controller: AuthController,
    private readonly authentication: AuthenticationMiddleware,
  ) {
    super('/auth', controller);
    this.registerEndpoints(this.controller);
  }

  protected registerEndpoints(controller: AuthController): void {
    this.router.post('/register', controller.register);
    this.router.post('/login', controller.login);
    this.router.post('/refresh', controller.refresh);
    this.router.post('/logout', this.authentication.handle, controller.logout);
  }
}
