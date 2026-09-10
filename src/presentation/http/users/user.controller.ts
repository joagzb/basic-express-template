import {NextFunction, Request, Response} from 'express';
import {UserService} from '../../../application/users/user.service';
import {AppError} from '../errors/app-error';
import {parseRequestDto, sendValidatedResponse} from '../middleware/http.middleware';
import {
  createUserRequestDtoSchema,
  createUserResponseDtoSchema,
  deleteUserRequestDtoSchema,
  deleteUserResponseDtoSchema,
  findUserRequestDtoSchema,
  findUserResponseDtoSchema,
  listUsersRequestDtoSchema,
  listUsersResponseDtoSchema,
  updateUserRequestDtoSchema,
  updateUserResponseDtoSchema,
} from './user.dto';

export class UserController {
  public constructor(private readonly users: UserService) {}

  public async findAll(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      parseRequestDto(listUsersRequestDtoSchema, {body: request.body ?? {}, params: request.params, query: request.query});
      sendValidatedResponse(response, listUsersResponseDtoSchema, 200, await this.users.findAll());
    } catch (error) {
      next(error);
    }
  }

  public async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const {body} = parseRequestDto(createUserRequestDtoSchema, {body: request.body ?? {}, params: request.params, query: request.query});
      sendValidatedResponse(response, createUserResponseDtoSchema, 200, {function: 'create', data: await this.users.create(body)});
    } catch (error) {
      next(error);
    }
  }

  public async findById(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const {params} = parseRequestDto(findUserRequestDtoSchema, {body: request.body ?? {}, params: request.params, query: request.query});
      const user = await this.users.findById(params.id);
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', `User ${params.id} was not found`);
      sendValidatedResponse(response, findUserResponseDtoSchema, 200, {function: 'getById', id: user.id});
    } catch (error) {
      next(error);
    }
  }

  public async update(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const {params, body} = parseRequestDto(updateUserRequestDtoSchema, {body: request.body ?? {}, params: request.params, query: request.query});
      await this.users.update(params.id, body);
      sendValidatedResponse(response, updateUserResponseDtoSchema, 200, {function: 'update'});
    } catch (error) {
      next(error);
    }
  }

  public async delete(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const {params} = parseRequestDto(deleteUserRequestDtoSchema, {body: request.body ?? {}, params: request.params, query: request.query});
      await this.users.delete(params.id);
      sendValidatedResponse(response, deleteUserResponseDtoSchema, 200, {function: 'delete'});
    } catch (error) {
      next(error);
    }
  }
}
