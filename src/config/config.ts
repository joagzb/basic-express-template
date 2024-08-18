import {AppConfig} from './config.types';
import dotenv from 'dotenv';

// load .env variables
dotenv.config();

/** ========================================================
 *
 * Manages server configurations
 *
 ======================================================== */
export default class ConfigService {
  private static instance: ConfigService;
  private readonly config: AppConfig = {
    database: {
      postgres: {
        HOST: process.env.POSTGRES_HOST ?? 'localhost',
        PORT: Number.parseInt(process.env.POSTGRES_PORT || '5432'),
        USERNAME: process.env.POSTGRES_USERNAME ?? 'postgres',
        PASSWORD: process.env.POSTGRES_PASSWORD ?? '',
        DATABASE: process.env.POSTGRES_DATABASE ?? 'dummyDB',
        SCHEMA: process.env.POSTGRES_SCHEMA,
      },
    },
    logging: {
      MIN_LEVEL: 'debug',
      ENABLED: true,
    },
    server: {
      NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production',
      GLOBAL_URL_PREFIX: process.env.URL_PREFIX || '/api',
      HOST: process.env.HOST || 'localhost',
      PORT: Number.parseInt(process.env.PORT || '3000'),
    },
    timezone: {
      FORMAT_TIME: process.env.FORMAT_TIME || 'YYYY-MM-DD HH:mm:ss',
      TIMEZONE: process.env.TIME_ZONE || process.env.TZ || 'UTC',
    },
  };

  // SINGLETON
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  // CTOR
  private constructor() {}

  public getConfig() {
    return this.config;
  }
}
