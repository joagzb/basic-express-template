import {LoginDto} from '../application/auth/auth.dto';
import {AuthService} from '../application/auth/auth.service';
import {ValidationError} from '../application/shared/validators/validation';
import {SessionStoreUnavailableError} from '../domain/auth/auth';
import {InMemoryAuthRegistrationRepository} from '../infrastructure/persistence/memory/in-memory-auth-registration.repository';
import {InMemoryAuthSessionRepository} from '../infrastructure/persistence/memory/in-memory-auth-session.repository';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {PasswordService, RefreshTokenService, TokenService} from '../infrastructure/security/security.service';

const createService = (
  repository: InMemoryUserRepository,
  sessions = new InMemoryAuthSessionRepository(repository.state),
  registrations = new InMemoryAuthRegistrationRepository(repository.state),
) =>
  new AuthService(repository, new PasswordService(4), new TokenService('test-secret-at-least-thirty-two-characters', 60), new RefreshTokenService(), sessions, registrations, 3600);

describe('AuthService', () => {
  test('validates and normalizes registration DTOs before creating credentials', async () => {
    const repository = new InMemoryUserRepository();
    const sessions = new InMemoryAuthSessionRepository(repository.state);
    const registrations = new InMemoryAuthRegistrationRepository(repository.state);
    const createCredential = jest.spyOn(repository, 'createCredential');
    const createSession = jest.spyOn(sessions, 'create');
    const createRegistration = jest.spyOn(registrations, 'create');
    const service = createService(repository, sessions, registrations);

    await expect(service.register({name: ' Test ', surname: ' User ', dateOfBirth: '2000-01-01', email: ' TEST@example.com ', password: 'secret'})).resolves.toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      tokenType: 'Bearer',
    });
    await expect(repository.findCredentialByEmail('test@example.com')).resolves.toMatchObject({
      user: {name: 'Test', surname: 'User', dateOfBirth: '2000-01-01'},
      email: 'test@example.com',
    });
    expect(createRegistration).toHaveBeenCalledWith(
      expect.objectContaining({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', passwordHash: expect.any(String)}),
      expect.objectContaining({id: expect.any(String), refreshTokenDigest: expect.any(String), createdAt: expect.any(String), expiresAt: expect.any(String)}),
      3600,
    );
    expect(createCredential).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  test('rejects malformed login DTOs before querying persistence', async () => {
    const repository = new InMemoryUserRepository();
    const findCredential = jest.spyOn(repository, 'findCredentialByEmail');
    const service = createService(repository);

    await expect(service.login({email: 'not-an-email', password: '', unexpected: true} as LoginDto)).rejects.toBeInstanceOf(ValidationError);
    expect(findCredential).not.toHaveBeenCalled();
  });

  test('enforces the shared login password length boundary', async () => {
    const repository = new InMemoryUserRepository();
    const findCredential = jest.spyOn(repository, 'findCredentialByEmail');
    const service = createService(repository);

    await expect(service.login({email: 'test@example.com', password: '12345'})).rejects.toBeInstanceOf(ValidationError);
    expect(findCredential).not.toHaveBeenCalled();

    await expect(service.login({email: 'test@example.com', password: '123456'})).resolves.toBeNull();
    expect(findCredential).toHaveBeenCalledWith('test@example.com');
  });

  test('uses the shared email format validation before querying persistence', async () => {
    const repository = new InMemoryUserRepository();
    const findCredential = jest.spyOn(repository, 'findCredentialByEmail');
    const service = createService(repository);

    await expect(service.login({email: 'test@example.c', password: '123456'})).rejects.toBeInstanceOf(ValidationError);
    expect(findCredential).not.toHaveBeenCalled();
  });

  test('allows exactly one concurrent registration for a normalized email', async () => {
    const repository = new InMemoryUserRepository();
    const service = createService(repository);
    const input = {name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'};

    const results = await Promise.all([service.register(input), service.register({...input, email: 'TEST@example.com'})]);

    expect(results.filter(result => result !== null)).toHaveLength(1);
    expect(results.filter(result => result === null)).toHaveLength(1);
    await expect(repository.findAll()).resolves.toHaveLength(1);
  });

  test('preserves passwords as opaque values', async () => {
    const repository = new InMemoryUserRepository();
    const service = createService(repository);

    await service.register({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: ' secret '});

    await expect(service.login({email: 'test@example.com', password: ' secret '})).resolves.toMatchObject({tokenType: 'Bearer'});
    await expect(service.login({email: 'test@example.com', password: 'secret'})).resolves.toBeNull();
  });

  test('creates concurrent sessions, rotates refresh tokens once, and revokes reused sessions', async () => {
    const repository = new InMemoryUserRepository();
    const sessions = new InMemoryAuthSessionRepository(repository.state);
    const service = createService(repository, sessions);
    const registration = await service.register({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'});
    const login = await service.login({email: 'test@example.com', password: 'secret'});

    expect(registration).not.toBeNull();
    expect(login).not.toBeNull();
    const rotated = await service.refresh({refreshToken: login!.refreshToken});
    expect(rotated).toMatchObject({accessToken: expect.any(String), refreshToken: expect.any(String), tokenType: 'Bearer'});
    expect(rotated!.refreshToken).not.toBe(login!.refreshToken);

    await expect(service.refresh({refreshToken: login!.refreshToken})).resolves.toBeNull();
    await expect(service.refresh({refreshToken: rotated!.refreshToken})).resolves.toBeNull();
    await expect(service.refresh({refreshToken: registration!.refreshToken})).resolves.toMatchObject({tokenType: 'Bearer'});
  });

  test('logout revokes only the selected session', async () => {
    const repository = new InMemoryUserRepository();
    const sessions = new InMemoryAuthSessionRepository(repository.state);
    const service = createService(repository, sessions);
    const registration = await service.register({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'});
    await service.login({email: 'test@example.com', password: 'secret'});
    const selectedSession = new RefreshTokenService().sessionId(registration!.refreshToken)!;

    await service.logout(selectedSession);

    await expect(service.refresh({refreshToken: registration!.refreshToken})).resolves.toBeNull();
    await expect(service.login({email: 'test@example.com', password: 'secret'})).resolves.toMatchObject({tokenType: 'Bearer'});
  });

  test('does not create a credential when atomic registration persistence is unavailable', async () => {
    const repository = new InMemoryUserRepository();
    const registrations = new InMemoryAuthRegistrationRepository(repository.state);
    jest.spyOn(registrations, 'create').mockRejectedValue(new SessionStoreUnavailableError());
    const service = createService(repository, new InMemoryAuthSessionRepository(repository.state), registrations);

    await expect(service.register({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'})).rejects.toBeInstanceOf(
      SessionStoreUnavailableError,
    );
    await expect(repository.findAll()).resolves.toHaveLength(0);
  });
});
