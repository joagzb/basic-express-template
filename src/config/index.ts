import dotenv from 'dotenv';
import {createAppConfig} from './app.config';
import {AppConfig} from './config.types';
import {createDatabaseConfig} from './database.config';
import {parseEnvironment} from './env';
import {createRedisConfig} from './redis.config';

export {PersistenceProvider} from './config.types';
export type {AppConfig, Environment, RuntimeAppConfig} from './config.types';
export {EnvironmentValidationError} from './env';

export const parseConfig = (source: NodeJS.ProcessEnv): AppConfig => {
  const environment = parseEnvironment(source);
  return {
    ...createAppConfig(environment),
    postgres: createDatabaseConfig(environment),
    redis: createRedisConfig(environment),
  };
};

export const loadConfig = (): AppConfig => {
  const selectedEnvironment = process.env.NODE_ENV ?? 'development';
  dotenv.config({path: `.env.${selectedEnvironment}`});
  dotenv.config();
  return parseConfig(process.env);
};
