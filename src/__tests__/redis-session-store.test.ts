import { AuthSession, SessionStoreUnavailableError } from '../domain/auth/auth';
import { RedisSessionRepository } from '../infrastructure/auth/redis-session.store';
import { RedisOperations } from '../infrastructure/cache/redis.interface';

const session: AuthSession = {
  id: 'session-id',
  userId: 'user-id',
  refreshTokenDigest: 'digest-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-01T01:00:00.000Z',
};

const createRedis = (): jest.Mocked<RedisOperations> => ({
  set: jest.fn().mockResolvedValue(undefined),
  put: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(false),
  exists: jest.fn().mockResolvedValue(false),
  expire: jest.fn().mockResolvedValue(false),
  ttl: jest.fn().mockResolvedValue(-2),
  compareDigestAndReplace: jest.fn().mockResolvedValue({status: 'updated', userId: 'user-id'}),
});

describe('RedisSessionStore', () => {
  test('creates TTL-backed sessions and rotates through one atomic operation', async () => {
    const redis = createRedis();
    const store = new RedisSessionRepository(redis);
    const replacement = {refreshTokenDigest: 'digest-2', expiresAt: session.expiresAt, rotatedAt: '2026-01-01T00:30:00.000Z'};

    await store.assertAvailable();
    await store.create(session, 3600);
    await expect(store.rotate(session.id, session.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'rotated', userId: 'user-id'});

    expect(redis.set).toHaveBeenCalledWith('auth:sessions:session-id', session, 3600);
    expect(redis.exists).toHaveBeenCalledWith('auth:sessions:availability');
    expect(redis.compareDigestAndReplace).toHaveBeenCalledWith('auth:sessions:session-id', 'digest-1', replacement, 3600);
    expect(redis.get).not.toHaveBeenCalled();
  });

  test('maps digest mismatches to reuse and revokes through the session key', async () => {
    const redis = createRedis();
    redis.compareDigestAndReplace.mockResolvedValue({status: 'mismatch'});
    const store = new RedisSessionRepository(redis);

    const replacement = {refreshTokenDigest: 'digest-2', expiresAt: session.expiresAt, rotatedAt: '2026-01-01T00:30:00.000Z'};
    await expect(store.rotate(session.id, 'old-digest', replacement, 3600)).resolves.toEqual({status: 'reused'});
    await store.revoke(session.id);

    expect(redis.delete).toHaveBeenCalledWith('auth:sessions:session-id');
  });

  test('fails closed when Redis operations fail', async () => {
    const redis = createRedis();
    redis.set.mockRejectedValue(new Error('offline'));
    redis.exists.mockRejectedValue(new Error('offline'));
    redis.compareDigestAndReplace.mockRejectedValue(new Error('offline'));
    redis.delete.mockRejectedValue(new Error('offline'));
    const store = new RedisSessionRepository(redis);

    await expect(store.assertAvailable()).rejects.toBeInstanceOf(SessionStoreUnavailableError);
    await expect(store.create(session, 3600)).rejects.toBeInstanceOf(SessionStoreUnavailableError);
    const replacement = {refreshTokenDigest: 'digest-2', expiresAt: session.expiresAt, rotatedAt: '2026-01-01T00:30:00.000Z'};
    await expect(store.rotate(session.id, 'digest', replacement, 3600)).rejects.toBeInstanceOf(SessionStoreUnavailableError);
    await expect(store.revoke(session.id)).rejects.toBeInstanceOf(SessionStoreUnavailableError);
  });
});
