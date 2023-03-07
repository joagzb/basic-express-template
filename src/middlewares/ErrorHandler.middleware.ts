import {NextFunction, Request, Response} from 'express';
import {HttpErrorHandler} from '../helpers/HTTPErrorHandler.util';
import {Logger} from '../services/Logger.service';

/**
 @description middleware - intercepts all HTTP error requests.
 @param err caught error
 @param req Express request object.
 @param res Express response object.
 @param next callback function. it is the next function to execute after middleware has correcly finished.
  @returns Express response
*/
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  Logger.getInstance().logger.error(err.message);
  return HttpErrorHandler(res, err.message, 500);
};
