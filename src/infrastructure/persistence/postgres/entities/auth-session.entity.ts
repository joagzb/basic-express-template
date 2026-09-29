import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm';
import {UserEntity} from './user.entity';

@Entity({name: 'auth_sessions'})
@Index('IDX_auth_sessions_user_id', ['userId'])
@Index('IDX_auth_sessions_expires_at', ['expiresAt'])
export class AuthSessionEntity {
  @PrimaryColumn({type: 'uuid'})
  public id!: string;

  @Column({name: 'user_id', type: 'uuid'})
  public userId!: string;

  @ManyToOne(() => UserEntity, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'user_id'})
  public user!: UserEntity;

  @Column({name: 'refresh_token_digest', type: 'varchar', length: 43, select: false})
  public refreshTokenDigest!: string;

  @Column({name: 'created_at', type: 'timestamptz'})
  public createdAt!: Date;

  @Column({name: 'expires_at', type: 'timestamptz'})
  public expiresAt!: Date;

  @Column({name: 'rotated_at', type: 'timestamptz', nullable: true})
  public rotatedAt!: Date | null;
}
