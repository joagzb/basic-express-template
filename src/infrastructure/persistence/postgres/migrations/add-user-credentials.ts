import {MigrationInterface, QueryRunner, TableColumn, TableUnique} from 'typeorm';

export class AddUserCredentials1760000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({name: 'email', type: 'varchar', length: '320', isNullable: true}),
      new TableColumn({name: 'password_hash', type: 'varchar', isNullable: true}),
    ]);
    await queryRunner.createUniqueConstraint('users', new TableUnique({name: 'UQ_users_email', columnNames: ['email']}));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint('users', 'UQ_users_email');
    await queryRunner.dropColumn('users', 'password_hash');
    await queryRunner.dropColumn('users', 'email');
  }
}
