import pino, {DestinationStream, Level, Logger} from 'pino';
import {LogContext, LoggerService, LogMethod} from '../../application/shared/logger.service';
import {AppConfig} from '../../config';

export interface LoggerDestination {
  write(message: string): unknown;
}

export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;
  public readonly trace: LogMethod;
  public readonly debug: LogMethod;
  public readonly info: LogMethod;
  public readonly warn: LogMethod;
  public readonly error: LogMethod;
  public readonly fatal: LogMethod;

  public constructor(config: Pick<AppConfig, 'logging'>, destination?: LoggerDestination) {
    this.logger = pino({
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

  private createLogMethod(level: Level): LogMethod {
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
      err: error
    };
  }
}

export const createLogger = (config: Pick<AppConfig, 'logging'>, destination?: LoggerDestination): LoggerService => new PinoLoggerService(config, destination);
