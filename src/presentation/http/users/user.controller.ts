import {NextFunction, Request, Response} from 'express';
import {UserService} from '../../../application/users/user.service';
import {AppError} from '../errors/app-error';

export class UserController {
  public constructor(private readonly users: UserService) {}

  public readonly findAll = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(200).json(await this.users.findAll());
    } catch (error) {
      next(error);
    }
  };

  public readonly create = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(200).json(await this.users.create(request.body));
    } catch (error) {
      next(error);
    }
  };

  public readonly findById = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.users.findById(request.params.id);
      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', `User ${request.params.id} was not found`);
      }

      response.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

  public readonly update = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const updatedUser = await this.users.update(request.params.id, request.body);
      response.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  public readonly delete = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      await this.users.delete(request.params.id);
      response.status(201).json();
    } catch (error) {
      next(error);
    }
  };
}
