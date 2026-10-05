import {QueryRunner, Table} from 'typeorm';
import {testConfig} from '../config/test-config';
import {PostgresDataSourceFactory} from '../infrastructure/persistence/postgres/data-source';
import {AuthSessionEntity} from '../infrastructure/persistence/postgres/entities/auth-session.entity';
import {CreateAuthSessionsTable1760000002000} from '../infrastructure/persistence/postgres/migrations/create-auth-sessions-table';

describe('PostgreSQL auth session schema', () => {
  test('registers the auth session entity and migration', () => {
    const dataSource = new PostgresDataSourceFactory().create(testConfig);
    const entities = dataSource.options.entities ?? [];
    const migrations = dataSource.options.migrations ?? [];

    expect(entities).toContain(AuthSessionEntity);
    expect(migrations).toContain(CreateAuthSessionsTable1760000002000);
  });

  test('creates the durable session table with expiry and user indexes', async () => {
    const createTable = jest.fn().mockResolvedValue(undefined);
    const queryRunner = {createTable} as unknown as QueryRunner;

    await new CreateAuthSessionsTable1760000002000().up(queryRunner);

    const table = createTable.mock.calls[0]?.[0] as Table;
    expect(table.name).toBe('auth_sessions');
    expect(table.findColumnByName('refresh_token_digest')?.length).toBe('43');
    expect(table.findColumnByName('rotated_at')?.isNullable).toBe(true);
    expect(table.indices.map(index => index.name)).toEqual(expect.arrayContaining(['IDX_auth_sessions_user_id', 'IDX_auth_sessions_expires_at']));
    expect(table.foreignKeys).toContainEqual(expect.objectContaining({name: 'FK_auth_sessions_user_id', onDelete: 'CASCADE'}));
  });
});
