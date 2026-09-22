import { LoginDto } from '../application/auth/auth.dto';
import { AuthService } from '../application/auth/auth.service';
import { ValidationError } from '../application/shared/validators/validation';
import { AuthSession, AuthSessionRotation, IAuthSessionRepository, SessionRotationResult, SessionStoreUnavailableError } from '../domain/auth/auth';
import { InMemoryUserRepository } from '../infrastructure/persistence/memory/in-memory-user.repository';
import { PasswordService, RefreshTokenService, TokenService } from '../infrastructure/security/security.service';

class InMemoryAuthSessionStore implements IAuthSessionRepository {
  public readonly sessions = new Map<string, AuthSession>();

  public assertAvailable(): Promise<void> {
    return Promise.resolve();
  }

  public async create(session: AuthSession, _ttlSeconds: number): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async rotate(sessionId: string, expectedDigest: string, replacement: AuthSessionRotation, _ttlSeconds: number): Promise<SessionRotationResult> {
    const current = this.sessions.get(sessionId);
    if (!current) {
      return {status: 'missing'};
    }
    if (current.refreshTokenDigest !== expectedDigest) {
      this.sessions.delete(sessionId);
      return {status: 'reused'};
    }
    this.sessions.set(sessionId, {...current, ...replacement});
    return {status: 'rotated', userId: current.userId};
  }

  public async revoke(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

const createService = (repository: InMemoryUserRepository, sessions = new InMemoryAuthSessionStore()) =>
  new AuthService(repository, new PasswordService(4), new TokenService('test-secret-at-least-thirty-two-characters', 60), new RefreshTokenService(), sessions, 3600);

describe('AuthService', () => {
  test('validates and normalizes registration DTOs before creating credentials', async () => {
    const repository = new InMemoryUserRepository();
    const service = createService(repository);

    await expect(service.register({name: ' Test ', surname: ' User ', dateOfBirth: '2000-01-01', email: ' TEST@example.com ', password: 'secret'})).resolves.toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
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
    const service = createService(repository);

    await expect(service.login({email: 'not-an-email', password: '', unexpected: true} as LoginDto)).rejects.toBeInstanceOf(ValidationError);
    expect(findCredential).not.toHaveBeenCalled();
  });

  test('rejects unexpected login properties before querying persistence', async () => {
    const repository = new InMemoryUserRepository();
    const findCredential = jest.spyOn(repository, 'findCredentialByEmail');
    const service = createService(repository);

    await expect(service.login({email: 'test@example.com', password: '123456', unexpected: true} as LoginDto)).rejects.toBeInstanceOf(ValidationError);
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
    const sessions = new InMemoryAuthSessionStore();
    const service = createService(repository, sessions);
    const registration = await service.register({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'});
    const login = await service.login({email: 'test@example.com', password: 'secret'});

    expect(registration).not.toBeNull();
    expect(login).not.toBeNull();
    expect(sessions.sessions.size).toBe(2);

    const rotated = await service.refresh({refreshToken: login!.refreshToken});
    expect(rotated).toMatchObject({accessToken: expect.any(String), refreshToken: expect.any(String), tokenType: 'Bearer'});
    expect(rotated!.refreshToken).not.toBe(login!.refreshToken);

    await expect(service.refresh({refreshToken: login!.refreshToken})).resolves.toBeNull();
    await expect(service.refresh({refreshToken: rotated!.refreshToken})).resolves.toBeNull();
    expect(sessions.sessions.size).toBe(1);
  });

  test('logout revokes only the selected session', async () => {
    const repository = new InMemoryUserRepository();
    const sessions = new InMemoryAuthSessionStore();
    const service = createService(repository, sessions);
    await service.register({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'});
    await service.login({email: 'test@example.com', password: 'secret'});
    const [selectedSession] = sessions.sessions.keys();

    await service.logout(selectedSession);

    expect(sessions.sessions.has(selectedSession)).toBe(false);
    expect(sessions.sessions.size).toBe(1);
  });

  test('fails registration closed before persistence when session storage is disabled', async () => {
    const repository = new InMemoryUserRepository();
    const createCredential = jest.spyOn(repository, 'createCredential');
    const sessions = new InMemoryAuthSessionStore();
    jest.spyOn(sessions, 'assertAvailable').mockRejectedValue(new SessionStoreUnavailableError());
    const service = createService(repository, sessions);

    await expect(service.register({name: 'Test', surname: 'User', dateOfBirth: '2000-01-01', email: 'test@example.com', password: 'secret'})).rejects.toBeInstanceOf(
      SessionStoreUnavailableError,
    );
    expect(createCredential).not.toHaveBeenCalled();
  });
});
