import {Router} from 'express';
import {AuthenticationMiddleware} from '../auth/authentication.middleware';
import {UserController} from './user.controller';
import { BaseRoutes } from '../base/base.routes';

export class UserRoutes extends BaseRoutes {
  public constructor(controller: UserController, authentication: AuthenticationMiddleware) {
    super();

    this.router.use(authentication.handle);
    this.router.get('/', (request, response, next) => void controller.findAll(request, response, next));
    this.router.get('/:id', (request, response, next) => void controller.findById(request, response, next));
    this.router.post('/', (request, response, next) => void controller.create(request, response, next));
    this.router.patch('/:id', (request, response, next) => void controller.update(request, response, next));
    this.router.delete('/:id', (request, response, next) => void controller.delete(request, response, next));

    this.definitions = {
      path: '/user', 
      router: this.router
    };
  }
}
