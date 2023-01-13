import {NextFunction, Request, Response} from 'express';
import {HttpErrorHandler} from '../helpers/HTTPErrorHandler.util';
import {Logger} from '../services/Logger.service';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  Logger.getInstance().logger.error(err.message);
  return HttpErrorHandler(res, err.message, 500);
};
