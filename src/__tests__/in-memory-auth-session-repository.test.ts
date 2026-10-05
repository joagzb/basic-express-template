import {AuthSession} from '../domain/auth/auth';
import {InMemoryAuthSessionRepository} from '../infrastructure/persistence/memory/in-memory-auth-session.repository';

const session: AuthSession = {
  id: 'session-id',
  userId: 'user-id',
  refreshTokenDigest: 'digest-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-01T01:00:00.000Z',
};

describe('InMemoryAuthSessionRepository', () => {
  test('creates, rotates, and revokes a session while preserving its user', async () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    const repository = new InMemoryAuthSessionRepository(() => now);
    const replacement = {refreshTokenDigest: 'digest-2', expiresAt: '2026-01-01T02:00:00.000Z', rotatedAt: '2026-01-01T00:30:00.000Z'};

    await repository.assertAvailable();
    await repository.create(session, 3600);
    await expect(repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'rotated', userId: session.userId});
    await repository.revoke(session.id);
    await expect(repository.rotate(session.id, replacement.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'missing'});
  });

  test('accepts a refresh-token digest only once under concurrent rotation', async () => {
    const repository = new InMemoryAuthSessionRepository(() => Date.parse('2026-01-01T00:00:00.000Z'));
    const replacement = {refreshTokenDigest: 'digest-2', expiresAt: session.expiresAt, rotatedAt: '2026-01-01T00:30:00.000Z'};
    await repository.create(session, 3600);

    const results = await Promise.all([
      repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600),
      repository.rotate(session.id, session.refreshTokenDigest, {...replacement, refreshTokenDigest: 'digest-3'}, 3600),
    ]);

    expect(results).toContainEqual({status: 'rotated', userId: session.userId});
    expect(results).toContainEqual({status: 'reused'});
    await expect(repository.rotate(session.id, replacement.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'missing'});
  });

  test('removes expired sessions and distinguishes expiry from token reuse', async () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const repository = new InMemoryAuthSessionRepository(() => now);
    const replacement = {refreshTokenDigest: 'digest-2', expiresAt: session.expiresAt, rotatedAt: '2026-01-01T00:30:00.000Z'};
    await repository.create(session, 1);

    now += 1000;

    await expect(repository.rotate(session.id, 'wrong-digest', replacement, 3600)).resolves.toEqual({status: 'missing'});
  });

  test('revokes a live session when a rotated token is reused', async () => {
    const repository = new InMemoryAuthSessionRepository(() => Date.parse('2026-01-01T00:00:00.000Z'));
    const replacement = {refreshTokenDigest: 'digest-2', expiresAt: session.expiresAt, rotatedAt: '2026-01-01T00:30:00.000Z'};
    await repository.create(session, 3600);
    await repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600);

    await expect(repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'reused'});
    await expect(repository.rotate(session.id, replacement.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'missing'});
  });
});
