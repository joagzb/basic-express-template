import {Router} from 'express';
import {HealthController} from './health.controller';

export class HealthRoutes extends BaseRoutes {
  public constructor(controller: HealthController) {
    

    router.get('/ping', (request, response, next) => controller.ping(request, response, next));

    this.definition = {
      path: '/health', 
      router
    };
  }
}
