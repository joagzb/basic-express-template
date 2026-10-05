import {MigrationInterface, QueryRunner, Table} from 'typeorm';

export class CreateUsersTable1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()'},
          {name: 'name', type: 'varchar', length: '100'},
          {name: 'surname', type: 'varchar', length: '100'},
          {name: 'date_of_birth', type: 'date'},
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
