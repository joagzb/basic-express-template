import {Router} from 'express';
import ConfigService from '../../config/config';
import {IBasicController} from './IBasicController.interface';

/** ========================================================
 *
 * wraps common controller's properties and behaviours
 *
 ======================================================== */
export abstract class FactoryRouteController<T extends IBasicController> {
  // PROPERTIES
  public readonly router: Router;
  protected configService: ConfigService;
  protected controller: T;

  // CTOR
  public constructor(controller: T) {
    this.configService = ConfigService.getInstance();
    this.router = Router();
    this.controller = controller;
    this.initMiddlewares();
    this.initRoutes();
  }

  // METHODS
  protected abstract initMiddlewares(): void;
  protected abstract initRoutes(): void;
}
