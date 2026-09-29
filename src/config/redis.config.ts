import {AppConfig} from './config.types';
import {ParsedEnvironment} from './env';

export const createRedisConfig = (environment: ParsedEnvironment): AppConfig['redis'] => {
  const credentials = environment.REDIS_PASSWORD ? `:${encodeURIComponent(environment.REDIS_PASSWORD)}@` : '';
  return {
    enabled: environment.REDIS_ENABLED,
    url: `redis://${credentials}${environment.REDIS_HOST}:${environment.REDIS_PORT}`,
    connectTimeoutMs: environment.REDIS_CONNECT_TIMEOUT_MS,
  };
};
