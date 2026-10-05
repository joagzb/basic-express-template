import bcrypt from 'bcrypt';
import jwt, {JwtPayload} from 'jsonwebtoken';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {IAccessTokenPayload, IPasswordHasher, IPasswordVerifier, IRefreshTokenService, ITokenService, RefreshToken} from '../../domain/auth/auth';

export class TokenService implements ITokenService {
  public constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
  ) {}

  public sign(subject: string, sessionId: string): string {
    return jwt.sign({sid: sessionId, tokenUse: 'access'}, this.secret, {subject, expiresIn: this.expiresInSeconds});
  }

  public verify(token: string): IAccessTokenPayload {
    const payload = jwt.verify(token, this.secret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || payload.tokenUse !== 'access') {
      throw new Error('Invalid access token payload');
    }
    return payload as JwtPayload & IAccessTokenPayload;
  }
}

export class RefreshTokenService implements IRefreshTokenService {
  public issue(sessionId: string = randomUUID()): RefreshToken {
    const value = `${sessionId}.${randomBytes(32).toString('base64url')}`;
    return {sessionId, value, digest: this.digest(value)};
  }

  public digest(token: string): string {
    return createHash('sha256').update(token).digest('base64url');
  }

  public sessionId(token: string): string | null {
    const separator = token.indexOf('.');
    if (separator <= 0 || separator === token.length - 1) {
      return null;
    }
    return token.slice(0, separator);
  }
}

export class PasswordService implements IPasswordHasher, IPasswordVerifier {
  public constructor(private readonly rounds: number) {}

  public hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  public compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
