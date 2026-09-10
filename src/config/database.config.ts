import {AppConfig} from './config.types';
import {ParsedEnvironment} from './env';

export const createDatabaseConfig = (environment: ParsedEnvironment): AppConfig['postgres'] => ({
  host: environment.POSTGRES_HOST,
  port: environment.POSTGRES_PORT,
  username: environment.POSTGRES_USERNAME,
  password: environment.POSTGRES_PASSWORD,
  database: environment.POSTGRES_DATABASE,
  schema: environment.POSTGRES_SCHEMA,
  connectTimeoutMs: environment.POSTGRES_CONNECT_TIMEOUT_MS,
});
