import {DataSource, EntityManager, Repository} from 'typeorm';
import {InitialAuthSession} from '../domain/auth/auth';
import {NewUserCredential} from '../domain/users/user';
import {InMemoryAuthRegistrationRepository} from '../infrastructure/persistence/memory/in-memory-auth-registration.repository';
import {InMemoryAuthSessionRepository} from '../infrastructure/persistence/memory/in-memory-auth-session.repository';
import {InMemoryPersistenceState} from '../infrastructure/persistence/memory/in-memory-persistence.state';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {AuthSessionEntity} from '../infrastructure/persistence/postgres/entities/auth-session.entity';
import {UserEntity} from '../infrastructure/persistence/postgres/entities/user.entity';
import {TypeOrmAuthRegistrationRepository} from '../infrastructure/persistence/postgres/repositories/typeorm-auth-registration.repository';

const credential: NewUserCredential = {
  name: 'Ada',
  surname: 'Lovelace',
  dateOfBirth: '1815-12-10',
  email: 'ADA@example.com',
  passwordHash: 'password-hash',
};
const session: InitialAuthSession = {
  id: '019b76da-a800-7000-8000-000000000001',
  refreshTokenDigest: 'digest-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-01T01:00:00.000Z',
};
const now = Date.parse(session.createdAt);

describe('atomic auth registration repositories', () => {
  test('commits the memory credential and session together and rejects a normalized duplicate without another session', async () => {
    const state = new InMemoryPersistenceState(() => now);
    const users = new InMemoryUserRepository(state);
    const sessions = new InMemoryAuthSessionRepository(state);
    const registrations = new InMemoryAuthRegistrationRepository(state);

    const created = await registrations.create(credential, session, 3600);
    const duplicateSession = {...session, id: '019b76da-a800-7000-8000-000000000002'};

    await expect(registrations.create({...credential, email: 'ada@example.com'}, duplicateSession, 3600)).resolves.toBeNull();
    await expect(users.findAll()).resolves.toHaveLength(1);
    await expect(users.findCredentialByEmail('ada@example.com')).resolves.toEqual(created);
    await expect(
      sessions.rotate(session.id, session.refreshTokenDigest, {refreshTokenDigest: 'digest-2', expiresAt: session.expiresAt, rotatedAt: session.createdAt}, 3600),
    ).resolves.toEqual({
      status: 'rotated',
      userId: created!.user.id,
    });
    await expect(
      sessions.rotate(duplicateSession.id, duplicateSession.refreshTokenDigest, {refreshTokenDigest: 'digest-3', expiresAt: session.expiresAt, rotatedAt: session.createdAt}, 3600),
    ).resolves.toEqual({
      status: 'missing',
    });
  });

  test('uses transaction-scoped TypeORM repositories for both inserts', async () => {
    const userEntity = {id: 'user-id', ...credential, email: 'ada@example.com'} as UserEntity;
    const users = {create: jest.fn().mockReturnValue(userEntity), save: jest.fn().mockResolvedValue(userEntity)} as unknown as jest.Mocked<Repository<UserEntity>>;
    const sessions = {insert: jest.fn().mockResolvedValue({})} as unknown as jest.Mocked<Repository<AuthSessionEntity>>;
    const manager = {
      getRepository: jest.fn(entity => (entity === UserEntity ? users : sessions)),
    } as unknown as EntityManager;
    const dataSource = {
      getRepository: jest.fn(),
      transaction: jest.fn(async work => work(manager)),
    } as unknown as DataSource;

    await expect(new TypeOrmAuthRegistrationRepository(dataSource, () => now).create(credential, session, 3600)).resolves.toMatchObject({
      user: {id: userEntity.id},
      email: 'ada@example.com',
    });
    expect(manager.getRepository).toHaveBeenNthCalledWith(1, UserEntity);
    expect(manager.getRepository).toHaveBeenNthCalledWith(2, AuthSessionEntity);
    expect(sessions.insert).toHaveBeenCalledWith(expect.objectContaining({userId: userEntity.id, expiresAt: new Date(session.expiresAt)}));
    expect(dataSource.getRepository).not.toHaveBeenCalled();
  });

  test('maps duplicate email SQLSTATE 23505 to null and propagates other failures', async () => {
    const users = {create: jest.fn().mockReturnValue({}), save: jest.fn().mockRejectedValue({code: '23505'})} as unknown as jest.Mocked<Repository<UserEntity>>;
    const sessions = {insert: jest.fn()} as unknown as jest.Mocked<Repository<AuthSessionEntity>>;
    const manager = {getRepository: jest.fn(entity => (entity === UserEntity ? users : sessions))} as unknown as EntityManager;
    const dataSource = {transaction: jest.fn(async work => work(manager))} as unknown as DataSource;
    const repository = new TypeOrmAuthRegistrationRepository(dataSource, () => now);

    await expect(repository.create(credential, session, 3600)).resolves.toBeNull();
    expect(sessions.insert).not.toHaveBeenCalled();

    const failure = new Error('database unavailable');
    users.save.mockRejectedValueOnce(failure);
    await expect(repository.create(credential, session, 3600)).rejects.toBe(failure);
  });

  test('propagates a session insert failure from the transaction', async () => {
    const userEntity = {id: 'user-id', ...credential, email: 'ada@example.com'} as UserEntity;
    const users = {create: jest.fn().mockReturnValue(userEntity), save: jest.fn().mockResolvedValue(userEntity)} as unknown as jest.Mocked<Repository<UserEntity>>;
    const failure = new Error('session insert failed');
    const sessions = {insert: jest.fn().mockRejectedValue(failure)} as unknown as jest.Mocked<Repository<AuthSessionEntity>>;
    const manager = {getRepository: jest.fn(entity => (entity === UserEntity ? users : sessions))} as unknown as EntityManager;
    const dataSource = {transaction: jest.fn(async work => work(manager))} as unknown as DataSource;

    await expect(new TypeOrmAuthRegistrationRepository(dataSource, () => now).create(credential, session, 3600)).rejects.toBe(failure);
  });
});
