import * as winston from 'winston';
import * as expressWinston from 'express-winston';
import Configuration from '../config/config';

/** ==========================================
 *
 * logger configuration and format.
 *
 ========================================== */
export class Logger {
  // PROPERTIES
  private static instance: Logger;
  public logger: winston.Logger;
  private _expressWinstonConfig: expressWinston.LoggerOptions;

  private FORMAT_TIME = 'YYYY-MM-DD HH:mm:ss';
  private TIME_ZONE = 'America/Argentina/Buenos_Aires';

  // SINGLETON
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }

    return Logger.instance;
  }

  // CTOR
  constructor() {
    this.logger = winston.createLogger({
      level: this.initLevel(),
      levels: winston.config.syslog.levels,
      format: this.initLogFormat(),
      transports: this.initTransports(),
    });

    this._expressWinstonConfig = {
      winstonInstance: this.logger,
      level: this.initLevel(), // Log only if info.level is less than or equal to this level
      meta: false, // optional: control whether you want to log the meta data about the request (default to true)
      transports: this.initTransports(),
      expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
      colorize: true, // Color the text nd status co;e, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
    };
  }

  // METHODS
  get expressWinstonConfig(): expressWinston.LoggerOptions {
    return this._expressWinstonConfig;
  }

  /**
    @description Configure the log error level. for the Winston logger
    @returns string representating minimum level that Winston logger must print
  */
  private initLevel(): string {
    return Configuration.getConfig().logging.MIN_LEVEL;
  }

  /**
    @description Configure the log format for the Winston logger
    @returns winston.Logform.Format
  */
  private initLogFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.errors({stack: true}), // show stack trace on error
      winston.format.json(),
      winston.format.timestamp({format: this.FORMAT_TIME}), // messages timestamps with the preferred format
      winston.format.colorize({all: true}), // Tell Winston that the logs must e colored
      winston.format.printf(
        // Define the format of the message showing the timestamp, the level and the message
        ({level, message, timestamp}) => `[${timestamp}] [${level}]: ${message}`,
      ),
    );
  }

  /**
    @description activate logging channels
    @returns winston.transport[]
  */
  private initTransports(): winston.transport[] {
    return [new winston.transports.Console()];
  }
}
