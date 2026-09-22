import {IPasswordHasher, IPasswordVerifier, ITokenService} from '../../domain/auth/auth';
import {IUserRepository} from '../../domain/users/user.repository';
import {ValidationError} from '../shared/validation';
import {AuthResultDto, LoginDto, RegisterDto} from './auth.dto';
import {AuthValidator} from './auth.validator';

export class AuthService {
  private readonly validator = new AuthValidator();

  public constructor(
    private readonly users: IUserRepository,
    private readonly passwords: IPasswordVerifier & IPasswordHasher,
    private readonly tokens: ITokenService,
  ) {}

  public async login(credentials: LoginDto): Promise<AuthResultDto | null> {
    const result = this.validator.validateLogin(credentials);
    if (!result.valid) {
      throw new ValidationError(result.issues);
    }

    const credential = await this.users.findCredentialByEmail(result.value.email);

    if (!credential || !(await this.passwords.compare(result.value.password, credential.passwordHash))) {
      return null;
    }

    return {
      accessToken: this.tokens.sign(credential.user.id),
      tokenType: 'Bearer',
    };
  }

  public async register(registrationInput: RegisterDto): Promise<AuthResultDto | null> {
    const result = this.validator.validateRegistration(registrationInput);
    if (!result.valid) {
      throw new ValidationError(result.issues);
    }

    const registration = result.value;
    
    const credential = await this.users.createCredential({
      name: registration.name,
      surname: registration.surname,
      dateOfBirth: registration.dateOfBirth,
      email: registration.email,
      passwordHash: await this.passwords.hash(registration.password),
    });

    if (!credential) {
      return null;
    }

    return {accessToken: this.tokens.sign(credential.user.id), tokenType: 'Bearer'};
  }
}
