import {NextFunction, Request, Response} from 'express';
import {AuthService} from '../../../application/auth/auth.service';
import {AppError} from '../errors/app-error';
import {AuthenticatedRequest} from './authentication.middleware';

export class AuthController {
  public constructor(private readonly auth: AuthService) {}

  public readonly register = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.auth.register(request.body);
      if (!result) {
        throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account already exists for this email');
      }
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  public readonly login = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.auth.login(request.body);
      if (!result) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
      }
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public readonly refresh = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.auth.refresh(request.body);
      if (!result) {
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token is invalid, expired, or has already been used');
      }
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public readonly logout = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      await this.auth.logout((request as AuthenticatedRequest).auth.sessionId);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
