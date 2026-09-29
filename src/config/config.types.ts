export type Environment = 'development' | 'test' | 'production';

export enum PersistenceProvider {
  MEMORY = 'memory',
  POSTGRES = 'postgres',
}

export interface AppConfig {
  readonly app: {readonly name: string; readonly version: string};
  readonly environment: Environment;
  readonly server: {readonly host: string; readonly port: number; readonly apiPrefix: string};
  readonly startup: {readonly connectRetries: number; readonly retryDelayMs: number};
  readonly logging: {readonly level: string};
  readonly persistence: {readonly provider: PersistenceProvider};
  readonly postgres: {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: string;
    readonly database: string;
    readonly schema: string;
    readonly connectTimeoutMs: number;
  };
  readonly redis: {readonly enabled: boolean; readonly url: string; readonly connectTimeoutMs: number};
  readonly security: {readonly jwtSecret: string; readonly jwtExpiresInSeconds: number; readonly refreshTokenExpiresInSeconds: number; readonly bcryptRounds: number};
}

export type RuntimeAppConfig = Pick<AppConfig, 'app' | 'environment' | 'server' | 'startup' | 'logging' | 'persistence' | 'security'>;
