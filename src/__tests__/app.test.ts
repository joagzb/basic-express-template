import {Router} from 'express';
import request from 'supertest';
import {AuthService} from '../application/auth/auth.service';
import {UserService} from '../application/users/user.service';
import {UserRepository} from '../domain/users/user.repository';
import {createLogger} from '../infrastructure/logging/logger';
import {InMemoryUserRepository} from '../infrastructure/persistence/memory/in-memory-user.repository';
import {PasswordService, TokenService} from '../infrastructure/security/security.service';
import {createApp} from '../presentation/http/app';
import {loginRequestDtoSchema} from '../presentation/http/auth/auth.dto';
import {AppError} from '../presentation/http/errors/app-error';
import {healthResponseDtoSchema} from '../presentation/http/health/health.dto';
import {createOpenApiDocument} from '../presentation/http/openapi';
import {testConfig} from '../testing/test-config';

const tokenService = new TokenService(testConfig.security.jwtSecret, testConfig.security.jwtExpiresInSeconds);
const accessToken = tokenService.sign('authenticated-user');

const createTestApp = (userService = new UserService(new InMemoryUserRepository()), authRepository = new InMemoryUserRepository()) => {
  return createApp({
    config: testConfig,
    logger: createLogger(testConfig),
    userService,
    authService: new AuthService(authRepository, new PasswordService(testConfig.security.bcryptRounds), tokenService),
    accessTokenService: tokenService,
  });
};

describe('HTTP application', () => {
  test('creates an app without opening a process listener', () => {
    const app = createTestApp();
    expect(app.listen).toBeDefined();
    expect(app.get('port')).toBeUndefined();
  });

  test('returns health status and Helmet headers', async () => {
    const responseValidation = jest.spyOn(healthResponseDtoSchema, 'parse');
    const response = await request(createTestApp()).get('/api/health/ping').expect(200);
    expect(response.body).toEqual({status: 'ok'});
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(responseValidation).toHaveBeenCalledWith({status: 'ok'});
  });

  test('lists persisted users from the plural collection endpoint', async () => {
    const app = createTestApp();
    const created = await request(app)
      .post('/api/user')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'})
      .expect(200);

    const response = await request(app).get('/api/users').set('Authorization', `Bearer ${accessToken}`).expect(200);

    expect(response.body).toEqual([created.body.data]);
    await request(app).get('/api/user').set('Authorization', `Bearer ${accessToken}`).expect(404);
  });

  test('returns the persisted user from POST', async () => {
    const app = createTestApp();
    const created = await request(app)
      .post('/api/user')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'})
      .expect(200);
    expect(created.body).toEqual({
      function: 'create',
      data: {id: expect.any(String), name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'},
    });
  });

  test('wires a validated create request through the controller and service to the repository contract', async () => {
    const create = jest.fn().mockResolvedValue({id: 'user-1', name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
    const repository = {
      create,
      createCredential: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findCredentialByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<UserRepository>;

    const response = await request(createTestApp(new UserService(repository)))
      .post('/api/user')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({name: ' Ada ', surname: ' Lovelace ', dateOfBirth: '1815-12-10'})
      .expect(200);

    expect(create).toHaveBeenCalledWith({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
    expect(response.body.data).toEqual({id: 'user-1', name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
  });

  test('returns the persisted user ID after querying the service', async () => {
    const repository = new InMemoryUserRepository();
    const persisted = await repository.create({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'});
    const userService = new UserService(repository);
    const findById = jest.spyOn(userService, 'findById');
    const response = await request(createTestApp(userService)).get(`/api/user/${persisted.id}`).set('Authorization', `Bearer ${accessToken}`).expect(200);

    expect(response.body).toEqual({function: 'getById', id: persisted.id});
    expect(findById).toHaveBeenCalledWith(persisted.id);
  });

  test('returns USER_NOT_FOUND when persistence has no matching user', async () => {
    const userService = new UserService(new InMemoryUserRepository());
    const findById = jest.spyOn(userService, 'findById');
    const response = await request(createTestApp(userService)).get('/api/user/missing-user').set('Authorization', `Bearer ${accessToken}`).expect(404);

    expect(response.body.error).toMatchObject({code: 'USER_NOT_FOUND', message: 'User missing-user was not found'});
    expect(findById).toHaveBeenCalledWith('missing-user');
  });

  test('returns operation acknowledgements for PATCH and DELETE while delegating persistence', async () => {
    const userService = new UserService(new InMemoryUserRepository());
    const update = jest.spyOn(userService, 'update');
    const remove = jest.spyOn(userService, 'delete');
    const app = createTestApp(userService);
    const userPath = '/api/user/example-id';

    const updated = await request(app).patch(userPath).set('Authorization', `Bearer ${accessToken}`).send({surname: 'Byron'}).expect(200);
    expect(updated.body).toEqual({function: 'update'});
    expect(update).toHaveBeenCalledWith('example-id', {surname: 'Byron'});

    expect((await request(app).delete(userPath).set('Authorization', `Bearer ${accessToken}`).expect(200)).body).toEqual({function: 'delete'});
    expect(remove).toHaveBeenCalledWith('example-id');
  });

  test('rejects an empty user update', async () => {
    const app = createTestApp();
    const created = await request(app)
      .post('/api/user')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'})
      .expect(200);
    await request(app).patch(`/api/user/${created.body.data.id}`).set('Authorization', `Bearer ${accessToken}`).send({}).expect(400);
  });

  test('returns a validation error for malformed input', async () => {
    const response = await request(createTestApp()).post('/api/user').set('Authorization', `Bearer ${accessToken}`).send({name: ''}).expect(400);
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
    expect(response.body.error.timestamp).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  test('returns the existing validation error shape for an invalid request DTO', async () => {
    const response = await request(createTestApp()).get('/api/user/example-id?unexpected=true').set('Authorization', `Bearer ${accessToken}`).expect(400);
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: "query: Unrecognized key(s) in object: 'unexpected'",
      details: {
        issues: [{code: 'unrecognized_keys', message: "Unrecognized key(s) in object: 'unexpected'", path: 'query'}],
      },
    });
  });

  test('includes the params path in route parameter validation errors', async () => {
    const response = await request(createTestApp()).get('/api/user/%20').set('Authorization', `Bearer ${accessToken}`).expect(400);
    expect(response.body.error.message).toBe('params.id: String must contain at least 1 character(s)');
    expect(response.body.error.details.issues[0].path).toBe('params.id');
  });

  test('returns a consistent response for unknown routes', async () => {
    const response = await request(createTestApp()).get('/missing').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.timestamp).toEqual(expect.any(String));
  });

  test('returns structured AppError details without breaking existing constructor usage', async () => {
    const router = Router();
    router.get('/expected', (_request, _response, next) => next(new AppError(409, 'EXPECTED_ERROR', 'Expected failure', {resourceId: 'user-1'})));
    const app = createApp({
      config: testConfig,
      logger: createLogger(testConfig),
      userService: new UserService(new InMemoryUserRepository()),
      authService: new AuthService(new InMemoryUserRepository(), new PasswordService(4), tokenService),
      accessTokenService: tokenService,
      additionalRoutes: [{path: '/test', router}],
    });

    const response = await request(app).get('/api/test/expected').expect(409);
    expect(response.body.error).toMatchObject({code: 'EXPECTED_ERROR', message: 'Expected failure', details: {resourceId: 'user-1'}});
    expect(response.body.error.timestamp).toEqual(expect.any(String));
  });

  test('handles route errors after deterministic registration', async () => {
    const router = Router();
    router.get('/boom', () => {
      throw new Error('sensitive implementation detail');
    });
    const app = createApp({
      config: testConfig,
      logger: createLogger(testConfig),
      userService: new UserService(new InMemoryUserRepository()),
      authService: new AuthService(new InMemoryUserRepository(), new PasswordService(4), tokenService),
      accessTokenService: tokenService,
      additionalRoutes: [{path: '/test', router}],
    });
    const response = await request(app).get('/api/test/boom').expect(500);
    expect(response.body.error).toMatchObject({code: 'INTERNAL_ERROR', message: 'An unexpected error occurred'});
    expect(response.body.error.timestamp).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain('sensitive implementation detail');
  });

  test('documents an editable JSON body and accurate response schemas for POST user', () => {
    const document = createOpenApiDocument(testConfig);
    const operation = document.paths['/user'].post;

    expect(document.paths['/user']).not.toHaveProperty('get');
    expect(document.paths).toHaveProperty('/users.get');
    expect(operation.requestBody).toEqual({
      required: true,
      content: {
        'application/json': {
          schema: {$ref: '#/components/schemas/CreateUserRequestDto'},
          example: {name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'},
        },
      },
    });
    expect(operation.responses['200'].content['application/json'].schema).toEqual({$ref: '#/components/schemas/CreateUserResponseDto'});
  });

  test('logs in with a persisted credential and returns a usable JWT access token', async () => {
    const repository = new InMemoryUserRepository();
    await repository.createCredential({
      name: 'Test',
      surname: 'User',
      dateOfBirth: '2000-01-01',
      email: 'test@example.com',
      passwordHash: await new PasswordService(4).hash('correct-password'),
    });
    const app = createTestApp(new UserService(repository), repository);

    const login = await request(app).post('/api/auth/login').send({email: 'test@example.com', password: 'correct-password'}).expect(200);
    expect(login.body).toEqual({accessToken: expect.any(String), tokenType: 'Bearer'});
    expect((await request(app).get('/api/users').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200)).body).toHaveLength(1);
  });

  test('rejects invalid credentials without issuing a token', async () => {
    const repository = new InMemoryUserRepository();
    await repository.createCredential({
      name: 'Test',
      surname: 'User',
      dateOfBirth: '2000-01-01',
      email: 'test@example.com',
      passwordHash: await new PasswordService(4).hash('correct-password'),
    });
    const response = await request(createTestApp(new UserService(repository), repository))
      .post('/api/auth/login')
      .send({email: 'test@example.com', password: 'wrong'})
      .expect(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(response.body).not.toHaveProperty('accessToken');
  });

  test('keeps login field errors when rejecting unknown top-level DTO properties', () => {
    const result = loginRequestDtoSchema.safeParse({
      body: {email: 'not-an-email', password: ''},
      params: {},
      query: {},
      unexpected: true,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({code: 'invalid_string', path: ['body', 'email']}),
        expect.objectContaining({code: 'too_small', path: ['body', 'password']}),
        expect.objectContaining({code: 'unrecognized_keys', path: []}),
      ]),
    );
  });

  test('rejects missing and malformed Bearer credentials on user endpoints', async () => {
    expect((await request(createTestApp()).get('/api/users').expect(401)).body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect((await request(createTestApp()).get('/api/users').set('Authorization', 'Basic credentials').expect(401)).body.error.code).toBe('INVALID_AUTHORIZATION_HEADER');
  });

  test('rejects expired access tokens', async () => {
    const expiredToken = new TokenService(testConfig.security.jwtSecret, -1).sign('expired-user');
    const response = await request(createTestApp()).get('/api/users').set('Authorization', `Bearer ${expiredToken}`).expect(401);
    expect(response.body.error.code).toBe('INVALID_ACCESS_TOKEN');
  });

  test('keeps health and login routes public while protecting every user route', async () => {
    const app = createTestApp();
    await request(app).get('/api/health/ping').expect(200);
    await request(app).post('/api/auth/login').send({email: 'nobody@example.com', password: 'wrong'}).expect(401);
    await request(app).get('/api/users').expect(401);
    await request(app).post('/api/user').send({}).expect(401);
    await request(app).get('/api/user/id').expect(401);
    await request(app).patch('/api/user/id').send({}).expect(401);
    await request(app).delete('/api/user/id').expect(401);
  });
});
