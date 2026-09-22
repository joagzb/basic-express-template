export type LogContext = object;

export interface LogMethod {
  (message: string): void;
  (context: LogContext, message?: string): void;
}

export interface ILoggerService {
  readonly trace: LogMethod;
  readonly debug: LogMethod;
  readonly info: LogMethod;
  readonly warn: LogMethod;
  readonly error: LogMethod;
  readonly fatal: LogMethod;
}
