import {Router} from 'express';
import {AuthController} from './auth.controller';

export class AuthRoutes extends BaseRoutes {

  public constructor(controller: AuthController) {


    router.post('/login', (request, response, next) => void controller.login(request, response, next));

    this.definition = {
      path: '/auth', 
      router
    };
  }
}
