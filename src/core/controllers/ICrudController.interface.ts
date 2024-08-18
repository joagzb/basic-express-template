import {Request, Response} from 'express';
import {IBasicController} from './IBasicController.interface';

export interface ICrudController extends IBasicController {
  getById(req: Request, res: Response): Promise<Response>;
  getAll(req: Request, res: Response): Promise<Response>;
  create(req: Request, res: Response): Promise<Response>;
  update(req: Request, res: Response): Promise<Response>;
  delete(req: Request, res: Response): Promise<Response>;
}
