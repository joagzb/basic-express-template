import {NextFunction, Request, Response} from 'express';
import {AuthService} from '../../../application/auth/auth.service';
import {AppError} from '../errors/app-error';
import {parseRequestDto, sendValidatedResponse} from '../middleware/http.middleware';
import {loginRequestDtoSchema, loginResponseDtoSchema} from './auth.dto';

export class AuthController {
  public constructor(private readonly auth: AuthService) {}

  public async login(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const {body} = parseRequestDto(loginRequestDtoSchema, {body: request.body ?? {}, params: request.params, query: request.query});
      const result = await this.auth.login(body);
      if (!result) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
      sendValidatedResponse(response, loginResponseDtoSchema, 200, result);
    } catch (error) {
      next(error);
    }
  }
}
