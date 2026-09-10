import {AccessTokenService, PasswordHasher, PasswordVerifier} from '../../domain/auth/auth';
import {UserRepository} from '../../domain/users/user.repository';
import {INPUT_CONSTRAINTS, parseRequiredString, parseStrictObject, throwIfInvalid, validateEmptyQuery, ValidationIssue} from '../shared/validation';

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
}

export interface RegisterCredentials extends LoginCredentials {
  readonly name: string;
  readonly surname: string;
  readonly dateOfBirth: string;
}

export class AuthService {
  public constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordVerifier & PasswordHasher,
    private readonly tokens: AccessTokenService,
  ) {}

  public async login(input: unknown, query: unknown = {}): Promise<LoginResult | null> {
    validateEmptyQuery(query);
    const credentials = this.parseLoginCredentials(input);
    const credential = await this.users.findCredentialByEmail(credentials.email.toLowerCase());
    if (!credential || !(await this.passwords.compare(credentials.password, credential.passwordHash))) return null;
    return {accessToken: this.tokens.sign(credential.user.id), tokenType: 'Bearer'};
  }

  public async register(input: unknown, query: unknown = {}): Promise<LoginResult | null> {
    validateEmptyQuery(query);
    const credentials = this.parseRegisterCredentials(input);
    const credential = await this.users.createCredential({
      name: credentials.name,
      surname: credentials.surname,
      dateOfBirth: credentials.dateOfBirth,
      email: credentials.email,
      passwordHash: await this.passwords.hash(credentials.password),
    });
    if (!credential) return null;
    return {accessToken: this.tokens.sign(credential.user.id), tokenType: 'Bearer'};
  }

  private parseLoginCredentials(input: unknown): LoginCredentials {
    const issues: ValidationIssue[] = [];
    const body = parseStrictObject(input, 'body', ['email', 'password'], issues);
    const email = parseRequiredString(body, 'email', 'body.email', issues, {...INPUT_CONSTRAINTS.email, email: true});
    const password = parseRequiredString(body, 'password', 'body.password', issues, INPUT_CONSTRAINTS.password);
    throwIfInvalid(issues);
    return {email: email as string, password: password as string};
  }

  private parseRegisterCredentials(input: unknown): RegisterCredentials {
    const issues: ValidationIssue[] = [];
    const body = parseStrictObject(input, 'body', ['name', 'surname', 'dateOfBirth', 'email', 'password'], issues);
    const name = parseRequiredString(body, 'name', 'body.name', issues, INPUT_CONSTRAINTS.userName);
    const surname = parseRequiredString(body, 'surname', 'body.surname', issues, INPUT_CONSTRAINTS.userName);
    const dateOfBirth = parseRequiredString(body, 'dateOfBirth', 'body.dateOfBirth', issues, {date: true});
    const email = parseRequiredString(body, 'email', 'body.email', issues, {...INPUT_CONSTRAINTS.email, email: true});
    const password = parseRequiredString(body, 'password', 'body.password', issues, INPUT_CONSTRAINTS.password);
    throwIfInvalid(issues);
    return {name: name as string, surname: surname as string, dateOfBirth: dateOfBirth as string, email: email as string, password: password as string};
  }
}
