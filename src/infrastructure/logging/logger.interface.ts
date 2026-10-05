export type LogContext = object;

export interface ILogMethod {
  (message: string): void;
  (context: LogContext, message?: string): void;
}

export interface ILoggerService {
  readonly trace: ILogMethod;
  readonly debug: ILogMethod;
  readonly info: ILogMethod;
  readonly warn: ILogMethod;
  readonly error: ILogMethod;
  readonly fatal: ILogMethod;
}
