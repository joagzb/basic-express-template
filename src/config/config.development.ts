import {AppConfig} from './config.types';
import dotenv from 'dotenv';

// load .env variables
dotenv.config();

export const developmentConfig: AppConfig = {
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
    NODE_ENV: 'development',
    GLOBAL_URL_PREFIX: process.env.URL_PREFIX || '/api',
    HOST: process.env.HOST || 'localhost',
    PORT: Number.parseInt(process.env.PORT || '3000'),
  },
};
