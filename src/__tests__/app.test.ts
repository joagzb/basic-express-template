import { Router } from 'express';
import request from 'supertest';
import { createApp } from '../app';
import { AuthService } from '../application/auth/auth.service';
import { HealthService } from '../application/health/health.service';
import { UserService } from '../application/users/user.service';
import { testConfig } from '../config/test-config';
import { AuthSession, AuthSessionRotation, IAuthSessionRepository, SessionRotationResult } from '../domain/auth/auth';
import { RedisSessionRepository } from '../infrastructure/auth/redis-session.store';
import { RedisService } from '../infrastructure/cache/redis.service';
import { createLogger } from '../infrastructure/logging/logger.service';
import { InMemoryUserRepository } from '../infrastructure/persistence/memory/in-memory-user.repository';
import { PasswordService, RefreshTokenService, TokenService } from '../infrastructure/security/security.service';
import { RouteDefinition } from '../presentation/http/base/base.routes';
import { createRoutes } from '../presentation/http/base/routes.factory';
import { AppError } from '../presentation/http/errors/app-error';
import { createOpenApiDocument } from '../presentation/http/openapi';

class InMemoryAuthSessionStore implements IAuthSessionRepository {
  private readonly sessions = new Map<string, AuthSession>();

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

const tokenService = new TokenService(testConfig.security.jwtSecret, testConfig.security.jwtExpiresInSeconds);

const createTestApp = (
  repository = new InMemoryUserRepository(),
  userService = new UserService(repository),
  additionalRoutes: RouteDefinition[] = [],
  sessions: IAuthSessionRepository = new InMemoryAuthSessionStore(),
) =>
  createApp({
    config: testConfig,
    logger: createLogger(testConfig),
    routes: [
      ...createRoutes({
        userService,
        authService: new AuthService(
          repository,
          new PasswordService(testConfig.security.bcryptRounds),
          tokenService,
          new RefreshTokenService(),
          sessions,
          testConfig.security.refreshTokenExpiresInSeconds,
        ),
        healthService: new HealthService(),
        accessTokenService: tokenService,
      }),
      ...additionalRoutes,
    ],
  });

const register = async (app: ReturnType<typeof createTestApp>) =>
  request(app).post('/api/auth/register').send({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10', email: 'ada@example.com', password: 'correct-password'});

describe('HTTP application', () => {
  test('creates an app without opening a listener and exposes public health', async () => {
    const app = createTestApp();
    expect(app.listen).toBeDefined();
    expect(app.get('port')).toBeUndefined();

    const response = await request(app).get('/api/health/ping').expect(200);
    expect(response.body).toEqual({status: 'ok'});
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('registers the health, auth, and protected user routes', async () => {
    const app = createTestApp();
    const registration = await register(app);
    expect(registration.status).toBe(201);

    await request(app).post('/api/auth/login').send({email: 'ada@example.com', password: 'correct-password'}).expect(200);
    await request(app).get('/api/users').set('Authorization', `Bearer ${registration.body.accessToken}`).expect(200);
    await request(app).get('/api/user').set('Authorization', `Bearer ${registration.body.accessToken}`).expect(404);
  });

  test('obtains a JWT through registration and login without startup credentials', async () => {
    const app = createTestApp();
    const registration = await register(app);
    expect(registration.status).toBe(201);
    expect(registration.body).toEqual({accessToken: expect.any(String), refreshToken: expect.any(String), tokenType: 'Bearer'});

    const login = await request(app).post('/api/auth/login').send({email: 'ADA@example.com', password: 'correct-password'}).expect(200);
    expect(login.body).toEqual({accessToken: expect.any(String), refreshToken: expect.any(String), tokenType: 'Bearer'});
    await request(app).get('/api/users').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
  });

  test('rotates refresh tokens and logs out the current session', async () => {
    const app = createTestApp();
    const registration = await register(app);

    const refresh = await request(app).post('/api/auth/refresh').send({refreshToken: registration.body.refreshToken}).expect(200);
    expect(refresh.body).toEqual({accessToken: expect.any(String), refreshToken: expect.any(String), tokenType: 'Bearer'});
    expect(refresh.body.refreshToken).not.toBe(registration.body.refreshToken);

    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${refresh.body.accessToken}`).expect(204);
    expect((await request(app).post('/api/auth/refresh').send({refreshToken: refresh.body.refreshToken}).expect(401)).body.error.code).toBe('INVALID_REFRESH_TOKEN');

    await request(app).get('/api/users').set('Authorization', `Bearer ${refresh.body.accessToken}`).expect(200);
  });

  test('validates refresh DTOs and requires access authentication for logout', async () => {
    const app = createTestApp();
    expect((await request(app).post('/api/auth/refresh').send({refreshToken: '', unexpected: true}).expect(400)).body.error.code).toBe('VALIDATION_ERROR');
    expect((await request(app).post('/api/auth/logout').expect(401)).body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  test('returns 503 without creating credentials when Redis sessions are disabled', async () => {
    const repository = new InMemoryUserRepository();
    const app = createTestApp(repository, new UserService(repository), [], new RedisSessionRepository(new RedisService()));

    const response = await register(app);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AUTH_SESSIONS_UNAVAILABLE');
    await expect(repository.findAll()).resolves.toEqual([]);
  });

  test('rejects duplicate registration and invalid login credentials', async () => {
    const app = createTestApp();
    await register(app);
    const duplicate = await register(app);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');

    const response = await request(app).post('/api/auth/login').send({email: 'ada@example.com', password: 'wrong!'}).expect(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('enforces the six-character login password boundary over HTTP', async () => {
    const app = createTestApp();
    await request(app).post('/api/auth/register').send({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10', email: 'ada@example.com', password: '123456'}).expect(201);

    const tooShort = await request(app).post('/api/auth/login').send({email: 'ada@example.com', password: '12345'}).expect(400);
    expect(tooShort.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {issues: [{code: 'too_small', message: 'String must contain at least 6 character(s)', path: 'body.password'}]},
    });

    const boundary = await request(app).post('/api/auth/login').send({email: 'ada@example.com', password: '123456'}).expect(200);
    expect(boundary.body).toEqual({accessToken: expect.any(String), refreshToken: expect.any(String), tokenType: 'Bearer'});
  });

  test('returns one success and one conflict for concurrent duplicate registration', async () => {
    const app = createTestApp();
    const responses = await Promise.all([register(app), register(app)]);

    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    expect(responses.find(response => response.status === 409)?.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  test('passes raw request values to services which normalize and validate DTOs', async () => {
    const app = createTestApp();
    const registration = await register(app);
    const token = registration.body.accessToken as string;

    const created = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({name: ' Grace ', surname: ' Hopper ', dateOfBirth: '1906-12-09'})
      .expect(200);
    expect(created.body).toMatchObject({name: 'Grace', surname: 'Hopper', dateOfBirth: '1906-12-09'});

    expect((await request(app).get('/api/users').set('Authorization', `Bearer ${token}`).expect(200)).body).toHaveLength(2);
  });

  test('preserves structured validation errors from application services', async () => {
    const app = createTestApp();
    const token = (await register(app)).body.accessToken as string;
    const response = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({name: ''}).expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'body.name: String must contain at least 1 character(s), body.surname: Required, body.dateOfBirth: Required',
      details: {
        issues: [
          {code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.name'},
          {code: 'invalid_type', message: 'Required', path: 'body.surname'},
          {code: 'invalid_type', message: 'Required', path: 'body.dateOfBirth'},
        ],
      },
    });
    expect(response.body.error.timestamp).toEqual(expect.any(String));
  });

  test('validates route params in application services', async () => {
    const app = createTestApp();
    const token = (await register(app)).body.accessToken as string;

    const paramsResponse = await request(app).get('/api/users/%20').set('Authorization', `Bearer ${token}`).expect(400);
    expect(paramsResponse.body.error.details.issues[0].path).toBe('params.id');
  });

  test('rejects empty updates', async () => {
    const app = createTestApp();
    const token = (await register(app)).body.accessToken as string;
    await request(app).patch('/api/users/example-id').set('Authorization', `Bearer ${token}`).send({}).expect(400);
  });

  test('gets users by ID and returns USER_NOT_FOUND for missing users', async () => {
    const app = createTestApp();
    const token = (await register(app)).body.accessToken as string;
    const created = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({name: 'Grace', surname: 'Hopper', dateOfBirth: '1906-12-09'}).expect(200);

    const id = created.body.id as string;
    expect((await request(app).get(`/api/users/${id}`).set('Authorization', `Bearer ${token}`).expect(200)).body).toEqual(created.body);

    const missing = await request(app).get('/api/users/missing-user').set('Authorization', `Bearer ${token}`).expect(404);
    expect(missing.body.error).toMatchObject({code: 'USER_NOT_FOUND', message: 'User missing-user was not found'});
  });

  test('updates and deletes users through protected routes', async () => {
    const app = createTestApp();
    const token = (await register(app)).body.accessToken as string;
    const created = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({name: 'Grace', surname: 'Hopper', dateOfBirth: '1906-12-09'}).expect(200);
    const id = created.body.id as string;

    expect((await request(app).patch(`/api/users/${id}`).set('Authorization', `Bearer ${token}`).send({surname: 'Murray'}).expect(200)).body).toMatchObject({
      id,
      surname: 'Murray',
    });
    expect((await request(app).get('/api/users').set('Authorization', `Bearer ${token}`).expect(200)).body).toEqual(
      expect.arrayContaining([expect.objectContaining({id, surname: 'Murray'})]),
    );

    expect((await request(app).delete(`/api/users/${id}`).set('Authorization', `Bearer ${token}`).expect(201)).text).toBe('');
    expect((await request(app).get(`/api/users/${id}`).set('Authorization', `Bearer ${token}`).expect(404)).body.error.code).toBe('USER_NOT_FOUND');
  });

  test('requires a valid Bearer token on every user endpoint', async () => {
    const app = createTestApp();
    expect((await request(app).get('/api/users').expect(401)).body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect((await request(app).post('/api/users').set('Authorization', 'Basic credentials').send({}).expect(401)).body.error.code).toBe('INVALID_AUTHORIZATION_HEADER');
  });

  test('rejects expired access tokens', async () => {
    const expiredToken = new TokenService(testConfig.security.jwtSecret, -1).sign('expired-user', 'expired-session');
    const response = await request(createTestApp()).get('/api/users').set('Authorization', `Bearer ${expiredToken}`).expect(401);
    expect(response.body.error.code).toBe('INVALID_ACCESS_TOKEN');
  });

  test('returns a consistent response for unknown routes', async () => {
    const response = await request(createTestApp()).get('/missing').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.timestamp).toEqual(expect.any(String));
  });

  test('returns a client error for malformed JSON bodies', async () => {
    const response = await request(createTestApp()).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":').expect(400);
    expect(response.body.error).toMatchObject({code: 'INVALID_JSON', message: 'Request body contains malformed JSON'});
    expect(response.body.error.timestamp).toEqual(expect.any(String));
  });

  test('keeps error middleware after additional routes', async () => {
    const router = Router();
    router.get('/expected', (_request, _response, next) => next(new AppError(409, 'EXPECTED_ERROR', 'Expected failure')));
    const repository = new InMemoryUserRepository();
    const app = createTestApp(repository, new UserService(repository), [{path: '/test', router}]);

    expect((await request(app).get('/api/test/expected').expect(409)).body.error.code).toBe('EXPECTED_ERROR');
  });

  test('sanitizes unexpected route errors', async () => {
    const router = Router();
    router.get('/boom', () => {
      throw new Error('sensitive implementation detail');
    });
    const repository = new InMemoryUserRepository();
    const app = createTestApp(repository, new UserService(repository), [{path: '/test', router}]);

    const response = await request(app).get('/api/test/boom').expect(500);
    expect(response.body.error).toMatchObject({code: 'INTERNAL_ERROR', message: 'An unexpected error occurred'});
    expect(JSON.stringify(response.body)).not.toContain('sensitive implementation detail');
  });

  test('documents registration, login, and editable user request bodies', () => {
    const document = createOpenApiDocument(testConfig);
    expect(document.paths).toHaveProperty('/auth/register.post');
    expect(document.paths).toHaveProperty('/auth/login.post');
    expect(document.paths).toHaveProperty('/auth/refresh.post');
    expect(document.paths).toHaveProperty('/auth/logout.post');
    expect(document.components.schemas.LoginRequestDto.properties.password.minLength).toBe(6);
    expect(document.paths['/users'].post.requestBody.content['application/json'].example).toEqual({
      name: 'Ada',
      surname: 'Lovelace',
      dateOfBirth: '1815-12-10',
    });
    expect(document.paths['/users'].post.responses['200'].content['application/json'].schema).toEqual({$ref: '#/components/schemas/UserResponseDto'});
    expect(document.paths['/users/{id}'].get.responses['200'].content['application/json'].schema).toEqual({$ref: '#/components/schemas/UserResponseDto'});
    expect(document.paths['/users/{id}'].delete.responses).toHaveProperty('201');
  });
});
