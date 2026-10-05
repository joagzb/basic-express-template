import {AuthenticationMiddleware} from '../auth/authentication.middleware';
import {BaseRoutes} from '../base/base.routes';
import {UserController} from './user.controller';

export class UserRoutes extends BaseRoutes<UserController> {
  public constructor(controller: UserController, authentication: AuthenticationMiddleware) {
    super('/users', controller);
    this.authentication = authentication;
    this.registerEndpoints(this.controller);
  }

  private readonly authentication: AuthenticationMiddleware;

  protected registerEndpoints(controller: UserController): void {
    this.router.use(this.authentication.handle);

    this.router.get('/', controller.findAll);
    this.router.post('/', controller.create);
    this.router.get('/:id', controller.findById);
    this.router.patch('/:id', controller.update);
    this.router.delete('/:id', controller.delete);
  }
}
