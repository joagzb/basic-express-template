import {NextFunction, Request, Response} from 'express';
import {HttpErrorHandler} from '../helpers/HTTPErrorHandler.util';
import {Logger} from '../services/Logger/Logger.service';

/**
 * @description Middleware to intercept all HTTP error requests.
 * @param err Caught error
 * @param req Express request object
 * @param res Express response object
 * @param next Callback function to pass control to the next middleware
 * @returns Express response
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  Logger.getInstance().logger.error(err.message);
  return HttpErrorHandler(res, err.message, 500);
};
