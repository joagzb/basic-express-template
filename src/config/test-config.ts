import {AppConfig, PersistenceProvider} from '../config';

export const testConfig: AppConfig = {
  app: {name: 'basic-express-server', version: '1.0.3'},
  environment: 'test',
  server: {host: '127.0.0.1', port: 3001, apiPrefix: '/api'},
  startup: {connectRetries: 1, retryDelayMs: 0},
  logging: {level: 'silent'},
  persistence: {provider: PersistenceProvider.MEMORY},
  postgres: {host: 'test-postgres', port: 5432, username: 'test', password: 'test', database: 'express_test', schema: 'public', connectTimeoutMs: 3000},
  redis: {enabled: false, url: 'redis://test-redis:6379', connectTimeoutMs: 3000, userCacheTtlSeconds: 60},
  security: {jwtSecret: 'test-secret-at-least-thirty-two-characters', jwtExpiresInSeconds: 60, refreshTokenExpiresInSeconds: 3600, bcryptRounds: 4},
};
