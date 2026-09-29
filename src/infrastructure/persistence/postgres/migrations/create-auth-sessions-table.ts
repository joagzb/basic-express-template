import {MigrationInterface, QueryRunner, Table} from 'typeorm';

export class CreateAuthSessionsTable1760000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_sessions',
        columns: [
          {name: 'id', type: 'uuid', isPrimary: true},
          {name: 'user_id', type: 'uuid'},
          {name: 'refresh_token_digest', type: 'varchar', length: '43'},
          {name: 'created_at', type: 'timestamptz'},
          {name: 'expires_at', type: 'timestamptz'},
          {name: 'rotated_at', type: 'timestamptz', isNullable: true},
        ],
        foreignKeys: [{name: 'FK_auth_sessions_user_id', columnNames: ['user_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE'}],
        indices: [
          {name: 'IDX_auth_sessions_user_id', columnNames: ['user_id']},
          {name: 'IDX_auth_sessions_expires_at', columnNames: ['expires_at']},
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_sessions');
  }
}
