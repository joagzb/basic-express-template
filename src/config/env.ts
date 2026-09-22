import {Environment, PersistenceProvider} from './config.types';

export class EnvironmentValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = EnvironmentValidationError.name;
  }
}

const invalidValue = (name: string, expectation: string): never => {
  throw new EnvironmentValidationError(`${name} ${expectation}`);
};

const parseString = (value: string | undefined, name: string, defaultValue: string, options: {readonly allowEmpty?: boolean; readonly pattern?: RegExp} = {}): string => {
  const parsed = value ?? defaultValue;
  if (!options.allowEmpty && parsed.length === 0) {
    invalidValue(name, 'must not be empty');
  }
  if (options.pattern && !options.pattern.test(parsed)) {
    invalidValue(name, 'has an invalid format');
  }
  return parsed;
};

const parseInteger = (value: string | undefined, name: string, defaultValue: number, range: {readonly min: number; readonly max?: number}): number => {
  const parsed = value === undefined ? defaultValue : Number(value);
  if (!Number.isInteger(parsed)) {
    invalidValue(name, 'must be an integer');
  }
  if (parsed < range.min || (range.max !== undefined && parsed > range.max)) {
    invalidValue(name, `must be between ${range.min} and ${range.max ?? 'Infinity'}`);
  }
  return parsed;
};

const parseAllowedValue = <T extends string>(value: string | undefined, name: string, defaultValue: T, allowedValues: readonly T[]): T => {
  const parsed = value ?? defaultValue;
  if (!allowedValues.includes(parsed as T)) {
    invalidValue(name, `must be one of: ${allowedValues.join(', ')}`);
  }
  return parsed as T;
};

const parseBoolean = (value: string | undefined, name: string, defaultValue: boolean): boolean => {
  return parseAllowedValue(value, name, String(defaultValue), ['true', 'false']) === 'true';
};

const environments: readonly Environment[] = ['development', 'test', 'production'];
const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
const persistenceProviders = Object.values(PersistenceProvider);

export interface ParsedEnvironment {
  readonly NODE_ENV: Environment;
  readonly HOST: string;
  readonly PORT: number;
  readonly URL_PREFIX: string;
  readonly LOG_LEVEL: (typeof logLevels)[number];
  readonly PERSISTENCE_PROVIDER: PersistenceProvider;
  readonly REDIS_ENABLED: boolean;
  readonly POSTGRES_HOST: string;
  readonly POSTGRES_PORT: number;
  readonly POSTGRES_USERNAME: string;
  readonly POSTGRES_PASSWORD: string;
  readonly POSTGRES_DATABASE: string;
  readonly POSTGRES_SCHEMA: string;
  readonly POSTGRES_CONNECT_TIMEOUT_MS: number;
  readonly REDIS_HOST: string;
  readonly REDIS_PORT: number;
  readonly REDIS_PASSWORD: string;
  readonly REDIS_CONNECT_TIMEOUT_MS: number;
  readonly STARTUP_CONNECT_RETRIES: number;
  readonly STARTUP_RETRY_DELAY_MS: number;
  readonly JWT_SECRET: string;
  readonly JWT_EXPIRES_IN_SECONDS: number;
  readonly BCRYPT_ROUNDS: number;
}

export const parseEnvironment = (source: NodeJS.ProcessEnv): ParsedEnvironment => {
  return {
    NODE_ENV: parseAllowedValue(source.NODE_ENV, 'NODE_ENV', 'development', environments),
    HOST: parseString(source.HOST, 'HOST', '0.0.0.0'),
    PORT: parseInteger(source.PORT, 'PORT', 3000, {min: 1, max: 65535}),
    URL_PREFIX: parseString(source.URL_PREFIX, 'URL_PREFIX', '/api', {pattern: /^\/[a-zA-Z0-9/_-]*$/}),
    LOG_LEVEL: parseAllowedValue(source.LOG_LEVEL, 'LOG_LEVEL', 'info', logLevels),
    PERSISTENCE_PROVIDER: parseAllowedValue(source.PERSISTENCE_PROVIDER, 'PERSISTENCE_PROVIDER', PersistenceProvider.POSTGRES, persistenceProviders),
    REDIS_ENABLED: parseBoolean(source.REDIS_ENABLED, 'REDIS_ENABLED', false),
    POSTGRES_HOST: parseString(source.POSTGRES_HOST, 'POSTGRES_HOST', 'localhost'),
    POSTGRES_PORT: parseInteger(source.POSTGRES_PORT, 'POSTGRES_PORT', 5432, {min: 1, max: 65535}),
    POSTGRES_USERNAME: parseString(source.POSTGRES_USERNAME, 'POSTGRES_USERNAME', 'postgres'),
    POSTGRES_PASSWORD: parseString(source.POSTGRES_PASSWORD, 'POSTGRES_PASSWORD', 'postgres', {allowEmpty: true}),
    POSTGRES_DATABASE: parseString(source.POSTGRES_DATABASE, 'POSTGRES_DATABASE', 'express_app'),
    POSTGRES_SCHEMA: parseString(source.POSTGRES_SCHEMA, 'POSTGRES_SCHEMA', 'public'),
    POSTGRES_CONNECT_TIMEOUT_MS: parseInteger(source.POSTGRES_CONNECT_TIMEOUT_MS, 'POSTGRES_CONNECT_TIMEOUT_MS', 3000, {min: 1, max: 60000}),
    REDIS_HOST: parseString(source.REDIS_HOST, 'REDIS_HOST', 'localhost'),
    REDIS_PORT: parseInteger(source.REDIS_PORT, 'REDIS_PORT', 6379, {min: 1, max: 65535}),
    REDIS_PASSWORD: parseString(source.REDIS_PASSWORD, 'REDIS_PASSWORD', '', {allowEmpty: true}),
    REDIS_CONNECT_TIMEOUT_MS: parseInteger(source.REDIS_CONNECT_TIMEOUT_MS, 'REDIS_CONNECT_TIMEOUT_MS', 3000, {min: 1, max: 60000}),
    STARTUP_CONNECT_RETRIES: parseInteger(source.STARTUP_CONNECT_RETRIES, 'STARTUP_CONNECT_RETRIES', 1, {min: 0, max: 10}),
    STARTUP_RETRY_DELAY_MS: parseInteger(source.STARTUP_RETRY_DELAY_MS, 'STARTUP_RETRY_DELAY_MS', 250, {min: 0, max: 30000}),
    JWT_SECRET: parseString(source.JWT_SECRET, 'JWT_SECRET', 'development-only-secret-change-me-now', {pattern: /^.{32,}$/}),
    JWT_EXPIRES_IN_SECONDS: parseInteger(source.JWT_EXPIRES_IN_SECONDS, 'JWT_EXPIRES_IN_SECONDS', 900, {min: 1}),
    BCRYPT_ROUNDS: parseInteger(source.BCRYPT_ROUNDS, 'BCRYPT_ROUNDS', 12, {min: 4, max: 15}),
  };
};
