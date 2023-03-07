import {Router} from 'express';
import Configuration from '../../../config/config';
import {IBasicController} from './IBasicController.interface';

/** ========================================================
 *
 * wraps common controller's properties and behaviours
 *
 ======================================================== */
export abstract class FactoryRouteController<T extends IBasicController> {
  // PROPERTIES
  public readonly router: Router;
  public readonly routeName;
  protected controller: T;

  // CTOR
  public constructor(controller: T) {
    this.router = Router();
    this.controller = controller;
    this.routeName = `${Configuration.getConfig().server.GLOBAL_URL_PREFIX}/${controller.routeName}`;
    this.initMiddlewares();
    this.initRoutes();
  }

  // METHODS
  protected abstract initMiddlewares(): void;
  protected abstract initRoutes(): void;
}
