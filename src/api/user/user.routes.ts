import {Router} from 'express';
import {FactoryRouteController} from '../shared/controllers/FactoryRouteController.class';
import {UserController} from './user.controller';

class UserRoutes extends FactoryRouteController<UserController> {
  // CTOR
  public constructor() {
    super(new UserController());
  }

  // OVERRIDE
  protected initRoutes(): void {
    this.router.get(``, (req, res) => this.controller.fulano(req, res));
    this.router.get(`/:id`, (req, res) => this.controller.getById(req, res));
    this.router.post(``, (req, res) => this.controller.create(req, res));
    this.router.patch(`/:id`, (req, res) => this.controller.update(req, res));
    this.router.delete(`/:id`, (req, res) => this.controller.delete(req, res));
  }

  protected initMiddlewares(): void {}
}

export default new UserRoutes();
