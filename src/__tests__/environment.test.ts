import {EnvironmentValidationError, parseConfig, PersistenceProvider} from '../config';
import {OpenApiDocument} from '../presentation/http/openapi';

describe('configuration boundaries', () => {
  test('selects test configuration without reading development values', () => {
    const config = parseConfig({NODE_ENV: 'test', POSTGRES_HOST: 'test-postgres', REDIS_HOST: 'test-redis'});
    expect(config.environment).toBe('test');
    expect(config.persistence.provider).toBe(PersistenceProvider.POSTGRES);
    expect(config.redis.enabled).toBe(false);
    expect(config.postgres.host).toBe('test-postgres');
    expect(config.redis.url).toBe('redis://test-redis:6379');
    expect(config.postgres.connectTimeoutMs).toBe(3000);
    expect(config.redis.connectTimeoutMs).toBe(3000);
    expect(config.security.refreshTokenExpiresInSeconds).toBe(2592000);
  });

  test('selects external providers explicitly', () => {
    const config = parseConfig({PERSISTENCE_PROVIDER: PersistenceProvider.POSTGRES, REDIS_ENABLED: 'true'});
    expect(config.persistence.provider).toBe(PersistenceProvider.POSTGRES);
    expect(config.redis.enabled).toBe(true);
  });

  test('uses memory only when explicitly selected', () => {
    expect(parseConfig({PERSISTENCE_PROVIDER: PersistenceProvider.MEMORY}).persistence.provider).toBe(PersistenceProvider.MEMORY);
  });

  test('normalizes API prefixes for route and documentation composition', () => {
    const config = parseConfig({URL_PREFIX: '/v1/'});
    expect(config.server.apiPrefix).toBe('/v1');
    expect(new OpenApiDocument(config).create().servers).toEqual([{url: '/v1'}]);
    expect(config.app.version).toBe('1.0.3');
    expect(new OpenApiDocument(config).create().info.version).toBe(config.app.version);
    expect(parseConfig({URL_PREFIX: '/'}).server.apiPrefix).toBe('');
  });

  test('rejects invalid ports', () => {
    expect(() => parseConfig({PORT: '70000'})).toThrow(EnvironmentValidationError);
    expect(() => parseConfig({REFRESH_TOKEN_EXPIRES_IN_SECONDS: '0'})).toThrow(EnvironmentValidationError);
  });
});
