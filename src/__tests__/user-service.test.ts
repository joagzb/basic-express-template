import {UserService} from '../application/users/user.service';
import {UserValidator} from '../application/users/user.validator';
import {UserRepository} from '../domain/users/user.repository';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {ValidationError} from '../application/shared/validation';

describe('UserService', () => {
  test('lists users through the repository contract', async () => {
    const repository = new InMemoryUserRepository();
    const service = new UserService(repository, new UserValidator());
    const created = await service.create({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});

    await expect(service.findAll()).resolves.toEqual([created]);
  });

  test('finds users through the repository contract and preserves missing results', async () => {
    const user = {id: 'provider-user', name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'};
    const findById = jest.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(null);
    const repository = {findById} as unknown as UserRepository;
    const service = new UserService(repository, new UserValidator());

    await expect(service.findById('provider-user')).resolves.toEqual(user);
    await expect(service.findById('missing-user')).resolves.toBeNull();
    expect(findById).toHaveBeenNthCalledWith(1, 'provider-user');
    expect(findById).toHaveBeenNthCalledWith(2, 'missing-user');
  });

  test('constructs normalized DTOs and rejects invalid input before persistence', async () => {
    const create = jest.fn();
    const repository = {create} as unknown as UserRepository;
    const service = new UserService(repository, new UserValidator());

    await service.create({name: ' Ada ', surname: ' Lovelace ', dateOfBirth: '1815-12-10'});
    expect(create).toHaveBeenCalledWith({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});

    await expect(service.create({name: '', unexpected: true})).rejects.toBeInstanceOf(ValidationError);
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('validates and normalizes updates before persistence', async () => {
    const update = jest.fn().mockResolvedValue({id: 'user-1', name: 'Ada', surname: 'Byron', dateOfBirth: '1815-12-10'});
    const repository = {update} as unknown as UserRepository;
    const service = new UserService(repository, new UserValidator());

    await service.update(' user-1 ', {surname: ' Byron '});
    expect(update).toHaveBeenCalledWith('user-1', {surname: 'Byron'});

    await expect(service.update('user-1', {})).rejects.toBeInstanceOf(ValidationError);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
