interface DBConnectionProperties {
  HOST: string;
  PORT: string | number;
}

interface postgresConnectionProperties extends DBConnectionProperties {
  USERNAME: string;
  PASSWORD?: string;
  DATABASE: string;
  SCHEMA?: string;
}

interface MysqlConnectionProperties extends DBConnectionProperties {
  USERNAME: string;
  PASSWORD?: string;
  DATABASE: string;
}

interface RedisConnectionProperties extends DBConnectionProperties {
  PASSWORD: string;
}

type DBConnectionConfig = postgresConnectionProperties | MysqlConnectionProperties | RedisConnectionProperties

/** ========================================================
 *
 * Manages database configurations
 *
 ======================================================== */
export class DatabaseConfiguration {
  // PROPERTIES
  public static datasources: string[] = process.env.DATASOURCES_ARRAY_NAME?.split(',') || [];

  // CTOR
  public constructor () {};

  /**
   * Returns the connection configuration object for the specified data source.
   * @param datasource The name of the data source (ej: redis, mysql, postgres).
   * @returns The connection configuration object.
   */
  public static getConnectionConfig(datasource: string): DBConnectionConfig | undefined {
    let connectionConfig: DBConnectionConfig;

    switch (datasource) {
      case 'mysql':
        connectionConfig = {
          HOST: process.env.MYSQL_HOST ?? 'localhost',
          PORT: process.env.MYSQL_PORT ?? 3306,
          USERNAME: process.env.MYSQL_USERNAME ?? 'root',
          PASSWORD: process.env.MYSQL_PASSWORD ?? '',
          DATABASE: process.env.MYSQL_DATABASE ?? 'dummyDB',
        };
        break;
      case 'postgres':
        connectionConfig = {
          HOST: process.env.POSTGRES_HOST ?? 'localhost',
          PORT: process.env.POSTGRES_PORT ?? 5432,
          USERNAME: process.env.POSTGRES_USERNAME ?? 'postgres',
          PASSWORD: process.env.POSTGRES_PASSWORD ?? '',
          DATABASE: process.env.POSTGRES_DATABASE ?? 'dummyDB',
          SCHEMA: process.env.POSTGRES_SCHEMA,
        };
        break;
      case 'redis':
        connectionConfig = {
          HOST: process.env.REDIS_HOST ?? '',
          PORT: process.env.REDIS_PORT ?? 6379,
          PASSWORD: process.env.REDIS_PASSWORD ?? '',
        };
        break;
      default:
        throw new Error("Unsupported datasoruce");
        break;
    }

    return connectionConfig;
  }

}
