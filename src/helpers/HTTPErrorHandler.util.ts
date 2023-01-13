import {NextFunction, Response} from 'express';

export const HttpErrorHandler = (
  res: Response,
  error: string,
  statusCode = 500,
) => {
  return res.status(statusCode).json({status: statusCode, error});
};
