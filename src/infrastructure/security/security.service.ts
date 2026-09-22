import bcrypt from 'bcrypt';
import jwt, {JwtPayload} from 'jsonwebtoken';
import {IAccessTokenPayload, IPasswordHasher, IPasswordVerifier, ITokenService} from '../../domain/auth/auth';

export class TokenService implements ITokenService {
  public constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
  ) {}

  public sign(subject: string): string {
    return jwt.sign({}, this.secret, {subject, expiresIn: this.expiresInSeconds});
  }

  public verify(token: string): IAccessTokenPayload {
    const payload = jwt.verify(token, this.secret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new Error('Invalid access token payload');
    }
    return payload as JwtPayload & IAccessTokenPayload;
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
