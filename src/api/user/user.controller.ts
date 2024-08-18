import {Request, Response} from 'express';
import {ICrudController} from '../../core/controllers/ICrudController.interface';
import {UserService} from './user.service';

export class UserController implements ICrudController {
  // PROPERTIES
  private userService: UserService;

  // CTOR
  public constructor() {
    this.userService = new UserService();
  }

  // METHODS
  public async fulano(req: Request, res: Response): Promise<Response> {
    return res.status(200).json(this.userService.getFulanoAge());
  }

  public async getAll(req: Request, res: Response): Promise<Response> {
    return res.status(200).json({function: 'getAll'});
  }

  public async getById(req: Request, res: Response): Promise<Response> {
    return res.status(200).json({function: 'getById', id: req.params.id});
  }

  public async create(req: Request, res: Response): Promise<Response> {
    return res.status(200).json({function: 'create', data: this.userService.create(req)});
  }

  public async update(req: Request, res: Response): Promise<Response> {
    return res.status(200).json({function: 'update'});
  }

  public async delete(req: Request, res: Response): Promise<Response> {
    return res.status(200).json({function: 'delete'});
  }

  // OVERRIDE
  public name(): string {
    return UserController.name;
  }
}
