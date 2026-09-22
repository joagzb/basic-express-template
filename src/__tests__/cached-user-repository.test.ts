import {RedisOperations} from '../infrastructure/cache/redis.interface';
import {ILoggerService} from '../infrastructure/logging/logger.interface';
import {CachedUserRepository} from '../infrastructure/persistence/cached-user.repository';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';

const createCache = (): jest.Mocked<RedisOperations> => ({
  set: jest.fn().mockResolvedValue(undefined),
  put: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(false),
  exists: jest.fn().mockResolvedValue(false),
  expire: jest.fn().mockResolvedValue(false),
  ttl: jest.fn().mockResolvedValue(-2),
  compareDigestAndReplace: jest.fn().mockResolvedValue({status: 'missing'}),
});

const createLogger = (): ILoggerService =>
  ({trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn()}) as unknown as ILoggerService;

describe('CachedUserRepository', () => {
  test('serves list and id cache hits without repeating authoritative reads', async () => {
    const repository = new InMemoryUserRepository();
    const user = await repository.create({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
    const findAll = jest.spyOn(repository, 'findAll');
    const findById = jest.spyOn(repository, 'findById');
    const cache = createCache();
    cache.get.mockImplementation(async key => (key === 'users:all' ? [{...user}] : {...user}));
    const cached = new CachedUserRepository(repository, cache, createLogger(), 60);

    await expect(cached.findAll()).resolves.toEqual([user]);
    await expect(cached.findById(user.id)).resolves.toEqual(user);

    expect(findAll).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  test('caches misses with the configured TTL', async () => {
    const repository = new InMemoryUserRepository();
    const user = await repository.create({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
    const cache = createCache();
    const cached = new CachedUserRepository(repository, cache, createLogger(), 45);

    await cached.findAll();
    await cached.findById(user.id);

    expect(cache.set).toHaveBeenCalledWith('users:all', [{...user}], 45);
    expect(cache.set).toHaveBeenCalledWith(`users:by-id:${user.id}`, {...user}, 45);
  });

  test('invalidates collection and id keys after successful writes including registration', async () => {
    const repository = new InMemoryUserRepository();
    const cache = createCache();
    const cached = new CachedUserRepository(repository, cache, createLogger(), 60);

    const created = await cached.create({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
    await cached.update(created.id, {surname: 'Byron'});
    await cached.delete(created.id);
    const credential = await cached.createCredential({
      name: 'Grace',
      surname: 'Hopper',
      dateOfBirth: '1906-12-09',
      email: 'grace@example.com',
      passwordHash: 'hash',
    });

    expect(credential).not.toBeNull();
    expect(cache.delete).toHaveBeenCalledWith('users:all');
    expect(cache.delete).toHaveBeenCalledWith(`users:by-id:${created.id}`);
    expect(cache.delete).toHaveBeenCalledWith(`users:by-id:${credential!.user.id}`);
  });

  test('fails open when cache reads, writes, or invalidations fail', async () => {
    const repository = new InMemoryUserRepository();
    const cache = createCache();
    cache.get.mockRejectedValue(new Error('cache read failed'));
    cache.set.mockRejectedValue(new Error('cache write failed'));
    cache.delete.mockRejectedValue(new Error('cache delete failed'));
    const logger = createLogger();
    const cached = new CachedUserRepository(repository, cache, logger, 60);

    const user = await cached.create({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
    await expect(cached.findAll()).resolves.toEqual([user]);
    await expect(cached.findById(user.id)).resolves.toEqual(user);
    await expect(cached.update(user.id, {surname: 'Byron'})).resolves.toMatchObject({surname: 'Byron'});

    expect(logger.warn).toHaveBeenCalled();
  });
});
