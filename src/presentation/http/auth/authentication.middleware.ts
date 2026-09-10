import {NextFunction, Request, RequestHandler, Response} from 'express';
import {AccessTokenService} from '../../../domain/auth/auth';
import {AppError} from '../errors/app-error';

export interface AuthenticatedPrincipal {
  readonly subject: string;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthenticatedPrincipal;
}

export class AuthenticationMiddleware {
  public constructor(private readonly tokens: AccessTokenService) {}

  public readonly handle: RequestHandler = (request: Request, _response: Response, next: NextFunction): void => {
    const authorization = request.header('authorization');
    if (!authorization) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'A Bearer access token is required'));
      return;
    }
    const match = /^Bearer ([^\s]+)$/.exec(authorization);
    if (!match) {
      next(new AppError(401, 'INVALID_AUTHORIZATION_HEADER', 'Authorization must use the Bearer token scheme'));
      return;
    }
    try {
      (request as AuthenticatedRequest).auth = {subject: this.tokens.verify(match[1]).sub};
      next();
    } catch {
      next(new AppError(401, 'INVALID_ACCESS_TOKEN', 'The access token is invalid or expired'));
    }
  };
}
