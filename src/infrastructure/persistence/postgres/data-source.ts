import {DataSource} from 'typeorm';
import {AppConfig} from '../../../config';
import {AuthSessionEntity} from './entities/auth-session.entity';
import {UserEntity} from './entities/user.entity';
import {AddUserCredentials1760000001000} from './migrations/add-user-credentials';
import {CreateAuthSessionsTable1760000002000} from './migrations/create-auth-sessions-table';
import {CreateUsersTable1760000000000} from './migrations/create-users-table';

export class PostgresDataSourceFactory {
  public create(config: AppConfig): DataSource {
    return new DataSource({
      type: 'postgres',
      host: config.postgres.host,
      port: config.postgres.port,
      username: config.postgres.username,
      password: config.postgres.password,
      database: config.postgres.database,
      schema: config.postgres.schema,
      connectTimeoutMS: config.postgres.connectTimeoutMs,
      entities: [UserEntity, AuthSessionEntity],
      migrations: [CreateUsersTable1760000000000, AddUserCredentials1760000001000, CreateAuthSessionsTable1760000002000],
      migrationsRun: true,
      synchronize: false,
      logging: false,
    });
  }
}
