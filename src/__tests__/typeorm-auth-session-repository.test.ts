import {DataSource, EntityManager, Repository} from 'typeorm';
import {AuthSession, SessionStoreUnavailableError} from '../domain/auth/auth';
import {AuthSessionEntity} from '../infrastructure/persistence/postgres/entities/auth-session.entity';
import {TypeOrmAuthSessionRepository} from '../infrastructure/persistence/postgres/repositories/typeorm-auth-session.repository';

const now = Date.parse('2026-01-01T00:00:00.000Z');
const session: AuthSession = {
  id: '019b76da-a800-7000-8000-000000000001',
  userId: '019b76da-a800-7000-8000-000000000002',
  refreshTokenDigest: 'digest-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-01T01:00:00.000Z',
};
const replacement = {refreshTokenDigest: 'digest-2', expiresAt: '2026-01-01T02:00:00.000Z', rotatedAt: '2026-01-01T00:30:00.000Z'};

const createFixture = (stored: Partial<AuthSessionEntity> | null = null) => {
  const ormRepository = {
    delete: jest.fn().mockResolvedValue({affected: 1}),
    findOne: jest.fn().mockResolvedValue(stored),
    insert: jest.fn().mockResolvedValue({identifiers: [], generatedMaps: [], raw: []}),
    update: jest.fn().mockResolvedValue({affected: 1}),
  } as unknown as jest.Mocked<Repository<AuthSessionEntity>>;
  const manager = {getRepository: jest.fn().mockReturnValue(ormRepository)} as unknown as EntityManager;
  const dataSource = {
    getRepository: jest.fn().mockReturnValue(ormRepository),
    transaction: jest.fn(async (work: (transactionManager: EntityManager) => unknown) => work(manager)),
  } as unknown as DataSource;

  return {dataSource, ormRepository, repository: new TypeOrmAuthSessionRepository(dataSource, () => now)};
};

describe('TypeOrmAuthSessionRepository', () => {
  test('stores only session metadata and applies the shorter expiry deadline', async () => {
    const {ormRepository, repository} = createFixture();

    await repository.create(session, 60);

    expect(ormRepository.insert).toHaveBeenCalledWith({
      id: session.id,
      userId: session.userId,
      refreshTokenDigest: session.refreshTokenDigest,
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(now + 60_000),
      rotatedAt: null,
    });
  });

  test('locks and atomically rotates a matching live session', async () => {
    const {ormRepository, repository} = createFixture({
      id: session.id,
      userId: session.userId,
      refreshTokenDigest: session.refreshTokenDigest,
      expiresAt: new Date(session.expiresAt),
    });

    await expect(repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'rotated', userId: session.userId});
    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: {id: session.id},
      select: {id: true, userId: true, refreshTokenDigest: true, expiresAt: true},
      lock: {mode: 'pessimistic_write'},
    });
    expect(ormRepository.update).toHaveBeenCalledWith(
      {id: session.id},
      {refreshTokenDigest: replacement.refreshTokenDigest, expiresAt: new Date(now + 3_600_000), rotatedAt: new Date(replacement.rotatedAt)},
    );
  });

  test('deletes a live session and reports reuse when the digest does not match', async () => {
    const {ormRepository, repository} = createFixture({
      id: session.id,
      userId: session.userId,
      refreshTokenDigest: 'different-digest',
      expiresAt: new Date(session.expiresAt),
    });

    await expect(repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'reused'});
    expect(ormRepository.delete).toHaveBeenCalledWith({id: session.id});
    expect(ormRepository.update).not.toHaveBeenCalled();
  });

  test('deletes an expired row and reports it as missing', async () => {
    const {ormRepository, repository} = createFixture({
      id: session.id,
      userId: session.userId,
      refreshTokenDigest: 'different-digest',
      expiresAt: new Date(now),
    });

    await expect(repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'missing'});
    expect(ormRepository.delete).toHaveBeenCalledWith({id: session.id});
  });

  test('reports an absent session as missing and revokes by session id', async () => {
    const {ormRepository, repository} = createFixture();

    await expect(repository.rotate(session.id, session.refreshTokenDigest, replacement, 3600)).resolves.toEqual({status: 'missing'});
    await repository.revoke(session.id);

    expect(ormRepository.update).not.toHaveBeenCalled();
    expect(ormRepository.delete).toHaveBeenCalledWith({id: session.id});
  });

  test('maps persistence failures to the session availability error', async () => {
    const {ormRepository, repository} = createFixture();
    ormRepository.delete.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(repository.assertAvailable()).rejects.toBeInstanceOf(SessionStoreUnavailableError);
  });
});
