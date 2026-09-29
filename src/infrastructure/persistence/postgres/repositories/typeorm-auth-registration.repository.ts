import {DataSource} from 'typeorm';
import {IAuthRegistrationRepository, InitialAuthSession} from '../../../../domain/auth/auth';
import {NewUserCredential, User, UserCredential} from '../../../../domain/users/user';
import {AuthSessionEntity} from '../entities/auth-session.entity';
import {UserEntity} from '../entities/user.entity';

class DuplicateEmailError extends Error {}

export class TypeOrmAuthRegistrationRepository implements IAuthRegistrationRepository {
  public constructor(
    private readonly dataSource: DataSource,
    private readonly now: () => number = Date.now,
  ) {}

  public async create(credential: NewUserCredential, session: InitialAuthSession, ttlSeconds: number): Promise<UserCredential | null> {
    const normalizedCredential = {...credential, email: credential.email.toLowerCase()};
    const expiresAt = this.expiryDeadline(session.expiresAt, ttlSeconds);
    const createdAt = this.parseDate(session.createdAt, 'creation');

    try {
      return await this.dataSource.transaction(async manager => {
        const users = manager.getRepository(UserEntity);
        const sessions = manager.getRepository(AuthSessionEntity);
        let userEntity: UserEntity;

        try {
          userEntity = await users.save(users.create(normalizedCredential));
        } catch (error) {
          if (this.isUniqueConstraintViolation(error)) {
            throw new DuplicateEmailError();
          }
          throw error;
        }

        await sessions.insert({
          id: session.id,
          userId: userEntity.id,
          refreshTokenDigest: session.refreshTokenDigest,
          createdAt,
          expiresAt,
          rotatedAt: session.rotatedAt ? this.parseDate(session.rotatedAt, 'rotation') : null,
        });

        return {
          user: this.toUser(userEntity),
          email: normalizedCredential.email,
          passwordHash: normalizedCredential.passwordHash,
        };
      });
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return null;
      }
      throw error;
    }
  }

  private expiryDeadline(expiresAt: string, ttlSeconds: number): Date {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new TypeError('Auth session TTL must be a positive integer in seconds');
    }

    const metadataExpiry = this.parseDate(expiresAt, 'expiry').getTime();
    return new Date(Math.min(metadataExpiry, this.now() + ttlSeconds * 1000));
  }

  private parseDate(value: string, label: string): Date {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      throw new TypeError(`Auth session ${label} must be a valid ISO date`);
    }
    return new Date(timestamp);
  }

  private toUser(entity: UserEntity): User {
    return {id: entity.id, name: entity.name, surname: entity.surname, dateOfBirth: entity.dateOfBirth};
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const databaseError = error as {code?: unknown; driverError?: {code?: unknown}};
    return databaseError.code === '23505' || databaseError.driverError?.code === '23505';
  }
}
