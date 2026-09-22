import { AuthSession, AuthSessionRotation, IAuthSessionRepository, SessionRotationResult, SessionStoreUnavailableError } from '../../domain/auth/auth';
import { RedisOperations } from '../cache/redis.interface';

export class RedisSessionRepository implements IAuthSessionRepository {
  public constructor(private readonly redis: RedisOperations) {}

  public async assertAvailable(): Promise<void> {
    try {
      await this.redis.exists('auth:sessions:availability');
    } catch (error) {
      throw new SessionStoreUnavailableError({cause: error});
    }
  }

  public async create(session: AuthSession, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(this.key(session.id), {...session}, ttlSeconds);
    } catch (error) {
      throw new SessionStoreUnavailableError({cause: error});
    }
  }

  public async rotate(sessionId: string, expectedDigest: string, replacement: AuthSessionRotation, ttlSeconds: number): Promise<SessionRotationResult> {
    try {
      const result = await this.redis.compareDigestAndReplace(this.key(sessionId), expectedDigest, {...replacement}, ttlSeconds);
      if (result.status === 'updated') {
        return {status: 'rotated', userId: result.userId};
      }
      return {status: result.status === 'mismatch' ? 'reused' : 'missing'};
    } catch (error) {
      throw new SessionStoreUnavailableError({cause: error});
    }
  }

  public async revoke(sessionId: string): Promise<void> {
    try {
      await this.redis.delete(this.key(sessionId));
    } catch (error) {
      throw new SessionStoreUnavailableError({cause: error});
    }
  }

  private key(sessionId: string): string {
    return `auth:sessions:${sessionId}`;
  }
}
