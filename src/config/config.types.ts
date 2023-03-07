export interface AppConfig {
  server: ServerConfig;
  database: DBConnectionConfig;
  logging: LoggingConfig;
}

/** ========================================================
 *
 * Logger configurations models
 *
 ======================================================== */
interface LoggingConfig {
  MIN_LEVEL: LoggerLevels;
  ENABLED: boolean;
}

// severity levels.
export type LoggerLevels = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'verbose' | 'silly';

/** ========================================================
 *
 * server configurations models
 *
 ======================================================== */
interface ServerConfig {
  NODE_ENV: environments;
  GLOBAL_URL_PREFIX: string;
  HOST: string;
  PORT: number;
}

export type environments = 'development' | 'production';

/** ========================================================
 *
 * database configurations models
 *
 ======================================================== */
type datasources = 'redis' | 'postgres' | 'mysql' | 'mongodb';

interface DBConnectionProperties {
  HOST: string;
  PORT: number;
}

interface DBAuthProperties {
  USERNAME: string;
  PASSWORD?: string;
}

export interface PostgresConnectionProperties extends DBConnectionProperties, DBAuthProperties {
  DATABASE: string;
  SCHEMA?: string;
}

export interface MysqlConnectionProperties extends DBConnectionProperties, DBAuthProperties {
  DATABASE: string;
}

export interface MongoDBConnectionProperties extends DBConnectionProperties, DBAuthProperties {
  DATABASE: string;
}

export interface RedisConnectionProperties extends DBConnectionProperties {
  PASSWORD: string;
}

type DBConnectionConfig = Partial<{
  redis: RedisConnectionProperties;
  postgres: PostgresConnectionProperties;
  mysql: MysqlConnectionProperties;
  mongodb: MongoDBConnectionProperties;
}>;
