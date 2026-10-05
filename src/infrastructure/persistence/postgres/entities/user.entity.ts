import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';
import {User} from '../../../../domain/users/user';

@Entity({name: 'users'})
export class UserEntity implements User {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({length: 100})
  public name!: string;

  @Column({length: 100})
  public surname!: string;

  @Column({name: 'date_of_birth', type: 'date'})
  public dateOfBirth!: string;

  @Column({type: 'varchar', length: 320, nullable: true, unique: true, select: false})
  public email!: string | null;

  @Column({name: 'password_hash', type: 'varchar', nullable: true, select: false})
  public passwordHash!: string | null;
}
