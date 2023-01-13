import {UserController} from 'api/user/user.controller';
import {Router} from 'express';
import {IBasicController} from './IBasicController.interface';
import Configuration from '../../../config/index';


export abstract class FactoryRouteController<T extends IBasicController> {
  // PROPERTIES
  public readonly router: Router;
  public readonly routeName;
  protected controller: T;

  // CTOR
  public constructor(routeName: string, controller: T) {
    this.router = Router();
    this.controller = controller;
    this.routeName = `${Configuration.ServerConfiguration.defaultConfig.GLOBAL_URL_PREFIX}/${routeName}`;
    this.initRoutes();
  }

  // METHODS
  protected abstract initRoutes(): void;
}
