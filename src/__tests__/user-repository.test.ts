import {getMetadataArgsStorage, Repository} from 'typeorm';
import {TypeOrmUserRepository} from '../infrastructure/persistence/postgres/typeorm-user.repository';
import {UserEntity} from '../infrastructure/persistence/postgres/user.entity';

const ada: UserEntity = {
  id: 'user-1',
  name: 'Ada',
  surname: 'Lovelace',
  dateOfBirth: '1815-12-10',
  email: null,
  passwordHash: null,
};

const credentialAda: UserEntity = {...ada, email: 'ada@example.com', passwordHash: 'password-hash'};

const createRepositoryMock = () =>
  ({
    create: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  }) as unknown as jest.Mocked<Repository<UserEntity>>;

describe('TypeOrmUserRepository', () => {
  test('declares nullable credential columns with PostgreSQL-supported types', () => {
    const columns = getMetadataArgsStorage().columns.filter(column => column.target === UserEntity);

    expect(columns.find(column => column.propertyName === 'email')?.options).toMatchObject({type: 'varchar', nullable: true});
    expect(columns.find(column => column.propertyName === 'passwordHash')?.options).toMatchObject({type: 'varchar', nullable: true});
  });

  test('creates and saves a TypeORM entity', async () => {
    const repository = createRepositoryMock();
    const input = {name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'};
    repository.create.mockReturnValue(ada);
    repository.save.mockResolvedValue(ada);

    await expect(new TypeOrmUserRepository(repository).create(input)).resolves.toEqual({id: ada.id, ...input});
    expect(repository.create).toHaveBeenCalledWith(input);
    expect(repository.save).toHaveBeenCalledWith(ada);
  });

  test('maps a PostgreSQL unique-email violation to a duplicate credential result', async () => {
    const repository = createRepositoryMock();
    repository.create.mockReturnValue(credentialAda);
    repository.save.mockRejectedValue({code: '23505'});

    await expect(
      new TypeOrmUserRepository(repository).createCredential({
        name: 'Ada',
        surname: 'Lovelace',
        dateOfBirth: '1815-12-10',
        email: 'ADA@example.com',
        passwordHash: 'password-hash',
      }),
    ).resolves.toBeNull();
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({email: 'ada@example.com'}));
  });

  test('does not hide non-unique credential persistence failures', async () => {
    const repository = createRepositoryMock();
    const failure = new Error('database unavailable');
    repository.create.mockReturnValue(credentialAda);
    repository.save.mockRejectedValue(failure);

    await expect(
      new TypeOrmUserRepository(repository).createCredential({
        name: 'Ada',
        surname: 'Lovelace',
        dateOfBirth: '1815-12-10',
        email: 'ada@example.com',
        passwordHash: 'password-hash',
      }),
    ).rejects.toBe(failure);
  });

  test('finds a user by ID', async () => {
    const repository = createRepositoryMock();
    repository.findOneBy.mockResolvedValue(ada);

    await expect(new TypeOrmUserRepository(repository).findById('user-1')).resolves.toEqual({id: ada.id, name: ada.name, surname: ada.surname, dateOfBirth: ada.dateOfBirth});
    expect(repository.findOneBy).toHaveBeenCalledWith({id: 'user-1'});
  });

  test('lists users', async () => {
    const repository = createRepositoryMock();
    repository.find.mockResolvedValue([ada]);

    await expect(new TypeOrmUserRepository(repository).findAll()).resolves.toEqual([{id: ada.id, name: ada.name, surname: ada.surname, dateOfBirth: ada.dateOfBirth}]);
    expect(repository.find).toHaveBeenCalledWith();
  });

  test('merges and saves an existing user update', async () => {
    const repository = createRepositoryMock();
    const updated = {...ada, surname: 'Byron'};
    repository.findOneBy.mockResolvedValue(ada);
    repository.merge.mockReturnValue(updated);
    repository.save.mockResolvedValue(updated);

    await expect(new TypeOrmUserRepository(repository).update('user-1', {surname: 'Byron'})).resolves.toEqual({
      id: updated.id,
      name: updated.name,
      surname: updated.surname,
      dateOfBirth: updated.dateOfBirth,
    });
    expect(repository.merge).toHaveBeenCalledWith(ada, {surname: 'Byron'});
    expect(repository.save).toHaveBeenCalledWith(updated);
  });

  test('returns null without writing when an update target is missing', async () => {
    const repository = createRepositoryMock();
    repository.findOneBy.mockResolvedValue(null);

    await expect(new TypeOrmUserRepository(repository).update('missing', {surname: 'Byron'})).resolves.toBeNull();
    expect(repository.merge).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  test('removes and returns an existing user', async () => {
    const repository = createRepositoryMock();
    repository.findOneBy.mockResolvedValue(ada);
    repository.remove.mockResolvedValue(ada);

    await expect(new TypeOrmUserRepository(repository).delete('user-1')).resolves.toEqual({id: ada.id, name: ada.name, surname: ada.surname, dateOfBirth: ada.dateOfBirth});
    expect(repository.remove).toHaveBeenCalledWith(ada);
  });

  test('returns null without removing when a delete target is missing', async () => {
    const repository = createRepositoryMock();
    repository.findOneBy.mockResolvedValue(null);

    await expect(new TypeOrmUserRepository(repository).delete('missing')).resolves.toBeNull();
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
