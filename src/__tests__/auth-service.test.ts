import {AuthService} from '../application/auth/auth.service';
import {ValidationError} from '../application/shared/validation';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {PasswordService, TokenService} from '../infrastructure/security/security.service';

describe('AuthService', () => {
  test('validates and normalizes registration DTOs before creating credentials', async () => {
    const repository = new InMemoryUserRepository();
    const service = new AuthService(repository, new PasswordService(4), new TokenService('test-secret-at-least-thirty-two-characters', 60));

    await expect(service.register({name: ' Test ', surname: ' User ', dateOfBirth: '2000-01-01', email: ' TEST@example.com ', password: 'secret'})).resolves.toEqual({
      accessToken: expect.any(String),
      tokenType: 'Bearer',
    });
    await expect(repository.findCredentialByEmail('test@example.com')).resolves.toMatchObject({
      user: {name: 'Test', surname: 'User', dateOfBirth: '2000-01-01'},
      email: 'test@example.com',
    });
  });

  test('rejects malformed login DTOs before querying persistence', async () => {
    const repository = new InMemoryUserRepository();
    const findCredential = jest.spyOn(repository, 'findCredentialByEmail');
    const service = new AuthService(repository, new PasswordService(4), new TokenService('test-secret-at-least-thirty-two-characters', 60));

    await expect(service.login({email: 'not-an-email', password: '', unexpected: true})).rejects.toBeInstanceOf(ValidationError);
    expect(findCredential).not.toHaveBeenCalled();
  });

  test('allows exactly one concurrent registration for a normalized email', async () => {
    const repository = new InMemoryUserRepository();
    const service = new AuthService(repository, new PasswordService(4), new TokenService('test-secret-at-least-thirty-two-characters', 60));
    const input = {name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'};

    const results = await Promise.all([service.register(input), service.register({...input, email: 'TEST@example.com'})]);

    expect(results.filter(result => result !== null)).toHaveLength(1);
    expect(results.filter(result => result === null)).toHaveLength(1);
    await expect(repository.findAll()).resolves.toHaveLength(1);
  });
});
