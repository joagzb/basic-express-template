import {NextFunction, Request, Response} from 'express';

export class HealthController {
  public constructor() {}

  public readonly ping = (_request: Request, response: Response, next: NextFunction): void => {
    try {
      response.status(200).json({status: 'ok'});
    } catch (error) {
      next(error);
    }
  };
}
