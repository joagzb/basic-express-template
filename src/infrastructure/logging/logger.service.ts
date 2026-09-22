import pino, { DestinationStream, Level, Logger } from 'pino';
import { AppConfig } from '../../config';
import { ILoggerService, ILogMethod, LogContext } from './logger.interface';

export interface LoggerDestination {
  write(message: string): unknown;
}

export class PinoLoggerService implements ILoggerService {
  private readonly logger: Logger;
  public readonly trace: ILogMethod;
  public readonly debug: ILogMethod;
  public readonly info: ILogMethod;
  public readonly warn: ILogMethod;
  public readonly error: ILogMethod;
  public readonly fatal: ILogMethod;

  public constructor(config: Pick<AppConfig, 'logging'>, destination?: LoggerDestination) {
    this.logger = pino(
      {
        level: config.logging.level,
        redact: {
          paths: ['req.headers.authorization', 'authorization', 'password', 'secret', 'token', '*.password', '*.secret', '*.token'],
          censor: '[REDACTED]',
        },
      },

      destination as DestinationStream | undefined,
    );

    this.trace = this.createLogMethod('trace');
    this.debug = this.createLogMethod('debug');
    this.info = this.createLogMethod('info');
    this.warn = this.createLogMethod('warn');
    this.error = this.createLogMethod('error');
    this.fatal = this.createLogMethod('fatal');
  }

  private createLogMethod(level: Level): ILogMethod {
    return (messageOrContext: string | LogContext, message?: string): void => {
      if (typeof messageOrContext === 'string') {
        this.logger[level](messageOrContext);
        return;
      }

      this.logger[level](this.serializeErrorContext(messageOrContext), message);
    };
  }

  private serializeErrorContext(context: LogContext): LogContext {
    const entries = context as Record<string, unknown>;
    if (!(entries.error instanceof Error) || entries.err !== undefined) {
      return context;
    }

    const {error, ...remainingContext} = entries;

    return {
      ...remainingContext,
      err: error,
    };
  }
}

export const createLogger = (config: Pick<AppConfig, 'logging'>, destination?: LoggerDestination): ILoggerService => new PinoLoggerService(config, destination);
