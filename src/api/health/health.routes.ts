import {FactoryRouteController} from '../../core/controllers/FactoryRouteController.class';
import {HealthController} from './health.controller';

class HealthRoutes extends FactoryRouteController<HealthController> {
  public constructor() {
    super(new HealthController());
  }

  protected initRoutes(): void {
    this.router.get('/healthBreath', (req, res) => this.controller.healthBreath(req, res));
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected initMiddlewares(): void {}
}

export default new HealthRoutes();
