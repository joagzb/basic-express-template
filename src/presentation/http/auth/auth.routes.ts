import {BaseRoutes} from '../base/base.routes';
import {AuthController} from './auth.controller';

export class AuthRoutes extends BaseRoutes<AuthController> {
  public constructor(controller: AuthController) {
    super('/auth', controller);
    this.registerEndpoints(this.controller);
  }

  protected registerEndpoints(controller: AuthController): void {
    this.router.post('/register', controller.register);
    this.router.post('/login', controller.login);
  }
}
