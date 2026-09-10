import {Request, Response} from 'express';

export class HealthController {
  public readonly ping = (_request: Request, response: Response): void => {
    response.status(200).json({status: 'ok'});
  };
}
