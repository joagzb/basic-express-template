import {AccessTokenService, PasswordVerifier} from '../../domain/auth/auth';
import {UserRepository} from '../../domain/users/user.repository';

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
}

export class AuthService {
  public constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordVerifier,
    private readonly tokens: AccessTokenService,
  ) {}

  public async login(input: LoginCredentials): Promise<LoginResult | null> {
    const credential = await this.users.findCredentialByEmail(input.email.toLowerCase());
    if (!credential || !(await this.passwords.compare(input.password, credential.passwordHash))) return null;
    return {accessToken: this.tokens.sign(credential.user.id), tokenType: 'Bearer'};
  }
}
