import {DataSource, LessThanOrEqual} from 'typeorm';
import {AuthSession, AuthSessionRotation, IAuthSessionRepository, SessionRotationResult, SessionStoreUnavailableError} from '../../../../domain/auth/auth';
import {AuthSessionEntity} from '../entities/auth-session.entity';

export class TypeOrmAuthSessionRepository implements IAuthSessionRepository {
  public constructor(
    private readonly dataSource: DataSource,
    private readonly now: () => number = Date.now,
  ) {}

  public async assertAvailable(): Promise<void> {
    try {
      await this.dataSource.getRepository(AuthSessionEntity).delete({expiresAt: LessThanOrEqual(new Date(this.now()))});
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  public async create(session: AuthSession, ttlSeconds: number): Promise<void> {
    const expiresAt = this.expiryDeadline(session.expiresAt, ttlSeconds);

    try {
      await this.dataSource.getRepository(AuthSessionEntity).insert({
        id: session.id,
        userId: session.userId,
        refreshTokenDigest: session.refreshTokenDigest,
        createdAt: this.parseDate(session.createdAt, 'creation'),
        expiresAt,
        rotatedAt: session.rotatedAt ? this.parseDate(session.rotatedAt, 'rotation') : null,
      });
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  public async rotate(sessionId: string, expectedDigest: string, replacement: AuthSessionRotation, ttlSeconds: number): Promise<SessionRotationResult> {
    const expiresAt = this.expiryDeadline(replacement.expiresAt, ttlSeconds);
    const rotatedAt = this.parseDate(replacement.rotatedAt, 'rotation');

    try {
      return await this.dataSource.transaction(async manager => {
        const repository = manager.getRepository(AuthSessionEntity);
        const session = await repository.findOne({
          where: {id: sessionId},
          select: {id: true, userId: true, refreshTokenDigest: true, expiresAt: true},
          lock: {mode: 'pessimistic_write'},
        });

        if (!session) {
          return {status: 'missing'};
        }

        if (session.expiresAt.getTime() <= this.now()) {
          await repository.delete({id: sessionId});
          return {status: 'missing'};
        }

        if (session.refreshTokenDigest !== expectedDigest) {
          await repository.delete({id: sessionId});
          return {status: 'reused'};
        }

        await repository.update(
          {id: sessionId},
          {
            refreshTokenDigest: replacement.refreshTokenDigest,
            expiresAt,
            rotatedAt,
          },
        );

        return {status: 'rotated', userId: session.userId};
      });
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  public async revoke(sessionId: string): Promise<void> {
    try {
      await this.dataSource.getRepository(AuthSessionEntity).delete({id: sessionId});
    } catch (error) {
      throw this.unavailable(error);
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

  private unavailable(cause: unknown): SessionStoreUnavailableError {
    return cause instanceof SessionStoreUnavailableError ? cause : new SessionStoreUnavailableError({cause});
  }
}
