import {IAuthRegistrationRepository, IAuthSessionRepository, IPasswordHasher, IPasswordVerifier, IRefreshTokenService, ITokenService, RefreshToken} from '../../domain/auth/auth';
import {IUserRepository} from '../../domain/users/user.repository';
import {ValidationError} from '../shared/validators/validation';
import {AuthResultDto, LoginDto, RefreshDto, RegisterDto} from './auth.dto';
import {AuthValidator} from './auth.validator';

export class AuthService {
  private readonly validator = new AuthValidator();

  public constructor(
    private readonly usersRepository: IUserRepository,
    private readonly passwords: IPasswordVerifier & IPasswordHasher,
    private readonly tokens: ITokenService,
    private readonly refreshTokens: IRefreshTokenService,
    private readonly sessionsRepository: IAuthSessionRepository,
    private readonly registrationsRepository: IAuthRegistrationRepository,
    private readonly refreshTokenTtlSeconds: number,
  ) {}

  public async login(credentials: LoginDto): Promise<AuthResultDto | null> {
    const result = this.validator.validateLogin(credentials);
    if (!result.valid) {
      throw new ValidationError(result.issues);
    }

    const credential = await this.usersRepository.findCredentialByEmail(result.value.email);

    if (!credential || !(await this.passwords.compare(result.value.password, credential.passwordHash))) {
      return null;
    }

    return this.createSession(credential.user.id);
  }

  public async register(registrationInput: RegisterDto): Promise<AuthResultDto | null> {
    const result = this.validator.validateRegistration(registrationInput);
    if (!result.valid) {
      throw new ValidationError(result.issues);
    }

    const registration = result.value;
    const refreshToken = this.refreshTokens.issue();
    const now = new Date();
    const credential = await this.registrationsRepository.create(
      {
        name: registration.name,
        surname: registration.surname,
        dateOfBirth: registration.dateOfBirth,
        email: registration.email,
        passwordHash: await this.passwords.hash(registration.password),
      },
      {
        id: refreshToken.sessionId,
        refreshTokenDigest: refreshToken.digest,
        createdAt: now.toISOString(),
        expiresAt: this.refreshTokenExpiresAt(now),
      },
      this.refreshTokenTtlSeconds,
    );

    if (!credential) {
      return null;
    }

    return this.createAuthResult(credential.user.id, refreshToken);
  }

  public async refresh(input: RefreshDto): Promise<AuthResultDto | null> {
    const result = this.validator.validateRefresh(input);
    if (!result.valid) {
      throw new ValidationError(result.issues);
    }

    const sessionId = this.refreshTokens.sessionId(result.value.refreshToken);
    if (!sessionId) {
      return null;
    }

    const replacementToken = this.refreshTokens.issue(sessionId);
    const now = new Date();
    const replacement = {
      refreshTokenDigest: replacementToken.digest,
      rotatedAt: now.toISOString(),
      expiresAt: this.refreshTokenExpiresAt(now),
    };

    const rotation = await this.sessionsRepository.rotate(sessionId, this.refreshTokens.digest(result.value.refreshToken), replacement, this.refreshTokenTtlSeconds);
    if (rotation.status !== 'rotated') {
      return null;
    }

    return this.createAuthResult(rotation.userId, replacementToken);
  }

  public async logout(sessionId: string): Promise<void> {
    await this.sessionsRepository.revoke(sessionId);
  }

  private async createSession(userId: string): Promise<AuthResultDto> {
    const refreshToken = this.refreshTokens.issue();
    const now = new Date();
    await this.sessionsRepository.create(
      {
        id: refreshToken.sessionId,
        userId,
        refreshTokenDigest: refreshToken.digest,
        createdAt: now.toISOString(),
        expiresAt: this.refreshTokenExpiresAt(now),
      },
      this.refreshTokenTtlSeconds,
    );

    return this.createAuthResult(userId, refreshToken);
  }

  private refreshTokenExpiresAt(now: Date): string {
    return new Date(now.getTime() + this.refreshTokenTtlSeconds * 1000).toISOString();
  }

  private createAuthResult(userId: string, refreshToken: RefreshToken): AuthResultDto {
    return {
      accessToken: this.tokens.sign(userId, refreshToken.sessionId),
      refreshToken: refreshToken.value,
      tokenType: 'Bearer',
    };
  }
}
