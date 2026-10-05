import {RuntimeAppConfig} from './config.types';
import {ParsedEnvironment} from './env';

export const createAppConfig = (environment: ParsedEnvironment): RuntimeAppConfig => ({
  app: {name: 'basic-express-server', version: '1.0.3'},
  environment: environment.NODE_ENV,
  server: {
    host: environment.HOST,
    port: environment.PORT,
    apiPrefix: environment.URL_PREFIX === '/' ? '' : environment.URL_PREFIX.replace(/\/+$/, ''),
  },
  startup: {connectRetries: environment.STARTUP_CONNECT_RETRIES, retryDelayMs: environment.STARTUP_RETRY_DELAY_MS},
  logging: {level: environment.LOG_LEVEL},
  persistence: {provider: environment.PERSISTENCE_PROVIDER},
  security: {
    jwtSecret: environment.JWT_SECRET,
    jwtExpiresInSeconds: environment.JWT_EXPIRES_IN_SECONDS,
    refreshTokenExpiresInSeconds: environment.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    bcryptRounds: environment.BCRYPT_ROUNDS,
  },
});
