import {Request, Response} from 'express';
import {IBasicController} from '../../core/controllers/IBasicController.interface';

export class HealthController implements IBasicController {
  public async ping(_req: Request, res: Response): Promise<Response> {
    return res.status(200).json({status: 'ok'});
  }

  public name(): string {
    return HealthController.name;
  }
}
