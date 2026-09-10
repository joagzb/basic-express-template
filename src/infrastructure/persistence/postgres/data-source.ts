import {DataSource} from 'typeorm';
import {AppConfig} from '../../../config';
import {CreateUsersTable1760000000000} from './migrations/create-users-table';
import {AddUserCredentials1760000001000} from './migrations/add-user-credentials';
import {UserEntity} from './user.entity';

export const createPostgresDataSource = (config: AppConfig): DataSource =>
  new DataSource({
    type: 'postgres',
    host: config.postgres.host,
    port: config.postgres.port,
    username: config.postgres.username,
    password: config.postgres.password,
    database: config.postgres.database,
    schema: config.postgres.schema,
    connectTimeoutMS: config.postgres.connectTimeoutMs,
    entities: [UserEntity],
    migrations: [CreateUsersTable1760000000000, AddUserCredentials1760000001000],
    migrationsRun: true,
    synchronize: false,
    logging: false,
  });
