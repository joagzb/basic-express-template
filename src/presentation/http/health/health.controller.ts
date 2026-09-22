import {NextFunction, Request, Response} from 'express';
import {HealthService} from '../../../application/health/health.service';

export class HealthController {
  public constructor(private readonly health: HealthService) {}

  public readonly ping = (_request: Request, response: Response, next: NextFunction): void => {
    try {
      response.status(200).json(this.health.getStatus());
    } catch (error) {
      next(error);
    }
  };
}
