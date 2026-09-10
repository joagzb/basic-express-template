import { IPasswordHasher, IPasswordVerifier, ITokenService } from '../../domain/auth/auth';
import { UserRepository } from '../../domain/users/user.repository';
import { AuthResultDto, LoginDto, RegisterDto } from './auth.dto';

export class AuthService {
  public constructor(
    private readonly users: UserRepository,
    private readonly passwords: IPasswordVerifier & IPasswordHasher,
    private readonly tokens: ITokenService,
  ) {}

  public async login(input: LoginDto): Promise<AuthResultDto | null> {
    const credential = await this.users.findCredentialByEmail(input.email);

    if (!credential || !(await this.passwords.compare(input.password, credential.passwordHash))) {
      return null;
    }

    return {
      accessToken: this.tokens.sign(credential.user.id), 
      tokenType: 'Bearer'
    };
  }

  public async register(input: RegisterDto): Promise<AuthResultDto | null> {
    const credential = await this.users.createCredential({
      name: input.name,
      surname: input.surname,
      dateOfBirth: input.dateOfBirth,
      email: input.email,
      passwordHash: await this.passwords.hash(input.password),
    });

    if (!credential) {
      return null;
    }

    return {accessToken: this.tokens.sign(credential.user.id), tokenType: 'Bearer'};
  }
}
