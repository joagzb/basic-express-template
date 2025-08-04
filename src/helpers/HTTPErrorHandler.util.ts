import {Response} from 'express';

/**
  @description handles a HTTP error on request.
  @param res Express response object.
  @param {number} statusCode HTTP status code to return
  @returns Express response
*/
export const HttpErrorHandler = (res: Response, error: string, statusCode = 500) => {
  return res.status(statusCode).json({status: statusCode, error});
};
