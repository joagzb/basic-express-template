import {RuntimeAppConfig} from '../../config';

const jsonContent = (schema: Readonly<Record<string, unknown>>, example?: unknown) => ({
  'application/json': {
    schema,
    ...(example === undefined ? {} : {example}),
  },
});

const errorResponse = {
  description: 'The request is invalid',
  content: jsonContent({$ref: '#/components/schemas/ErrorResponseDto'}),
};

const userIdParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'User identifier',
  schema: {type: 'string'},
};

export const createOpenApiDocument = (config: RuntimeAppConfig) =>
  ({
    openapi: '3.0.3',
    info: {title: 'Basic Express Template API', version: config.app.version},
    servers: [{url: config.server.apiPrefix || '/'}],
    paths: {
      '/health/ping': {
        get: {
          summary: 'Check API health',
          responses: {
            '200': {
              description: 'Application is healthy',
              content: jsonContent({$ref: '#/components/schemas/HealthResponseDto'}, {status: 'ok'}),
            },
          },
        },
      },
      '/auth/login': {
        post: {
          summary: 'Sign in',
          description: 'Verifies a registered user credential and returns a JWT access token.',
          requestBody: {
            required: true,
            content: jsonContent({$ref: '#/components/schemas/LoginRequestDto'}, {email: 'ada@example.com', password: 'correct-password'}),
          },
          responses: {
            '200': {
              description: 'JWT access token',
              content: jsonContent({$ref: '#/components/schemas/LoginResponseDto'}),
            },
            '400': errorResponse,
            '401': {description: 'Credentials are invalid', content: jsonContent({$ref: '#/components/schemas/ErrorResponseDto'})},
          },
        },
      },
      '/auth/register': {
        post: {
          summary: 'Register an account',
          description: 'Creates a user credential and returns a JWT access token.',
          requestBody: {
            required: true,
            content: jsonContent(
              {$ref: '#/components/schemas/RegisterRequestDto'},
              {name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10', email: 'ada@example.com', password: 'correct-password'},
            ),
          },
          responses: {
            '201': {description: 'JWT access token', content: jsonContent({$ref: '#/components/schemas/LoginResponseDto'})},
            '400': errorResponse,
            '409': {description: 'Email is already registered', content: jsonContent({$ref: '#/components/schemas/ErrorResponseDto'})},
          },
        },
      },
      '/users': {
        get: {
          summary: 'List users',
          description: 'Returns every user available through the configured persistence provider.',
          security: [{bearerAuth: []}],
          responses: {
            '200': {
              description: 'User collection',
              content: jsonContent({$ref: '#/components/schemas/ListUsersResponseDto'}, []),
            },
            '400': errorResponse,
          },
        },
        post: {
          summary: 'Create a user',
          description: 'Validates and persists a user with the configured persistence provider.',
          security: [{bearerAuth: []}],
          requestBody: {
            required: true,
            content: jsonContent({$ref: '#/components/schemas/CreateUserRequestDto'}, {name: 'Ada', surname: 'Lovelace', dateOfBirth: '1815-12-10'}),
          },
          responses: {
            '200': {
              description: 'Persisted user',
              content: jsonContent({$ref: '#/components/schemas/UserResponseDto'}),
            },
            '400': errorResponse,
          },
        },
      },
      '/users/{id}': {
        get: {
          summary: 'Find a user by identifier',
          description: 'Queries the configured persistence provider and returns the matching user.',
          security: [{bearerAuth: []}],
          parameters: [userIdParameter],
          responses: {
            '200': {
              description: 'Persisted user',
              content: jsonContent({$ref: '#/components/schemas/UserResponseDto'}),
            },
            '400': errorResponse,
            '404': errorResponse,
          },
        },
        patch: {
          summary: 'Update a user',
          description: 'Updates and returns the persisted user, or null when the identifier does not exist.',
          security: [{bearerAuth: []}],
          parameters: [userIdParameter],
          requestBody: {
            required: true,
            content: jsonContent({$ref: '#/components/schemas/UpdateUserRequestDto'}, {surname: 'Byron'}),
          },
          responses: {
            '200': {
              description: 'Updated user or null',
              content: jsonContent({allOf: [{$ref: '#/components/schemas/UserResponseDto'}], nullable: true}),
            },
            '400': errorResponse,
          },
        },
        delete: {
          summary: 'Delete a user',
          description: 'Attempts to delete the persisted user and returns an empty response.',
          security: [{bearerAuth: []}],
          parameters: [userIdParameter],
          responses: {
            '201': {description: 'Delete request completed'},
            '400': errorResponse,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {type: 'http', scheme: 'bearer', bearerFormat: 'JWT'},
      },
      schemas: {
        HealthResponseDto: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {status: {type: 'string', enum: ['ok']}},
        },
        UserResponseDto: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'surname', 'dateOfBirth'],
          properties: {
            id: {type: 'string'},
            name: {type: 'string'},
            surname: {type: 'string'},
            dateOfBirth: {type: 'string', format: 'date'},
          },
        },
        LoginRequestDto: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'password'],
          properties: {
            email: {type: 'string', format: 'email'},
            password: {type: 'string', format: 'password'},
          },
        },
        LoginResponseDto: {
          type: 'object',
          additionalProperties: false,
          required: ['accessToken', 'tokenType'],
          properties: {
            accessToken: {type: 'string'},
            tokenType: {type: 'string', enum: ['Bearer']},
          },
        },
        RegisterRequestDto: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'surname', 'dateOfBirth', 'email', 'password'],
          properties: {
            name: {type: 'string'},
            surname: {type: 'string'},
            dateOfBirth: {type: 'string', format: 'date'},
            email: {type: 'string', format: 'email'},
            password: {type: 'string', format: 'password'},
          },
        },
        CreateUserRequestDto: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'surname', 'dateOfBirth'],
          properties: {
            name: {type: 'string'},
            surname: {type: 'string'},
            dateOfBirth: {type: 'string', format: 'date'},
          },
        },
        UpdateUserRequestDto: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: {type: 'string'},
            surname: {type: 'string'},
            dateOfBirth: {type: 'string', format: 'date'},
          },
        },
        ListUsersResponseDto: {
          type: 'array',
          items: {$ref: '#/components/schemas/UserResponseDto'},
        },
        ValidationIssue: {
          type: 'object',
          additionalProperties: false,
          required: ['code', 'message', 'path'],
          properties: {code: {type: 'string'}, message: {type: 'string'}, path: {type: 'string'}},
        },
        ErrorResponseDto: {
          type: 'object',
          additionalProperties: false,
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              additionalProperties: false,
              required: ['code', 'message', 'timestamp'],
              properties: {
                code: {type: 'string'},
                message: {type: 'string'},
                timestamp: {type: 'string', format: 'date-time'},
                details: {
                  type: 'object',
                  additionalProperties: true,
                  properties: {issues: {type: 'array', items: {$ref: '#/components/schemas/ValidationIssue'}}},
                },
              },
            },
          },
        },
      },
    },
  }) as const;
