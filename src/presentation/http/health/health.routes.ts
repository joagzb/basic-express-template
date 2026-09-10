import {BaseRoutes} from '../base/base.routes';
import {HealthController} from './health.controller';

export class HealthRoutes extends BaseRoutes<HealthController> {
  public constructor(controller: HealthController) {
    super('/health', controller);

    this.registerEndpoints(this.controller);
  }

  protected registerEndpoints(controller: HealthController): void {
    this.router.get('/ping', controller.ping);
  }
}
