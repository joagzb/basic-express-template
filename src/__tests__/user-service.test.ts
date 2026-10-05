import {ValidationError} from '../application/shared/validators/validation';
import {CreateUserDto} from '../application/users/user.dto';
import {UserService} from '../application/users/user.service';
import {IUserRepository} from '../domain/users/user.repository';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';

describe('UserService', () => {
  test('lists users through the repository contract', async () => {
    const repository = new InMemoryUserRepository();
    const service = new UserService(repository);
    const created = await service.create({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});

    await expect(service.findAll()).resolves.toEqual([created]);
  });

  test('finds users through the repository contract and preserves missing results', async () => {
    const user = {id: 'provider-user', name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'};
    const findById = jest.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(null);
    const repository = {findById} as unknown as IUserRepository;
    const service = new UserService(repository);

    await expect(service.findById('provider-user')).resolves.toEqual(user);
    await expect(service.findById('missing-user')).resolves.toBeNull();
    expect(findById).toHaveBeenNthCalledWith(1, 'provider-user');
    expect(findById).toHaveBeenNthCalledWith(2, 'missing-user');
  });

  test('constructs normalized DTOs and rejects invalid input before persistence', async () => {
    const create = jest.fn();
    const repository = {create} as unknown as IUserRepository;
    const service = new UserService(repository);

    await service.create({name: ' Ada ', surname: ' Lovelace ', dateOfBirth: '1815-12-10'});
    expect(create).toHaveBeenCalledWith({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});

    await expect(service.create({name: '', unexpected: true} as unknown as CreateUserDto)).rejects.toBeInstanceOf(ValidationError);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
