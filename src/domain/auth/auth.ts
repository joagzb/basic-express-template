export interface IAccessTokenPayload {
  readonly sub: string;
  readonly sid: string;
  readonly tokenUse: 'access';
}

export interface ITokenService {
  sign(subject: string, sessionId: string): string;
  verify(token: string): IAccessTokenPayload;
}

export interface RefreshToken {
  readonly sessionId: string;
  readonly value: string;
  readonly digest: string;
}

export interface IRefreshTokenService {
  issue(sessionId?: string): RefreshToken;
  digest(token: string): string;
  sessionId(token: string): string | null;
}

export interface AuthSession {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenDigest: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly rotatedAt?: string;
}

export interface AuthSessionRotation {
  readonly refreshTokenDigest: string;
  readonly expiresAt: string;
  readonly rotatedAt: string;
}

export type SessionRotationResult = {readonly status: 'rotated'; readonly userId: string} | {readonly status: 'missing' | 'reused'};

export interface IAuthSessionRepository {
  assertAvailable(): Promise<void>;
  create(session: AuthSession, ttlSeconds: number): Promise<void>;
  rotate(sessionId: string, expectedDigest: string, replacement: AuthSessionRotation, ttlSeconds: number): Promise<SessionRotationResult>;
  revoke(sessionId: string): Promise<void>;
}

export class SessionStoreUnavailableError extends Error {
  public constructor(options?: ErrorOptions) {
    super('Authentication sessions are unavailable', options);
    this.name = SessionStoreUnavailableError.name;
  }
}

export interface IPasswordVerifier {
  compare(password: string, hash: string): Promise<boolean>;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
}
