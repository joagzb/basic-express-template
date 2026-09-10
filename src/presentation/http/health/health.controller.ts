import {NextFunction, Request, Response} from 'express';
import {parseRequestDto, sendValidatedResponse} from '../middleware/http.middleware';
import {healthRequestDtoSchema, healthResponseDtoSchema} from './health.dto';

export class HealthController {
  public ping(request: Request, response: Response, next: NextFunction): void {
    try {
      parseRequestDto(healthRequestDtoSchema, {body: request.body ?? {}, params: request.params, query: request.query});
      sendValidatedResponse(response, healthResponseDtoSchema, 200, {status: 'ok'});
    } catch (error) {
      next(error);
    }
  }
}
