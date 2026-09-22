export interface IAccessTokenPayload {
  readonly sub: string;
}

export interface ITokenService {
  sign(subject: string): string;
  verify(token: string): IAccessTokenPayload;
}

export interface IPasswordVerifier {
  compare(password: string, hash: string): Promise<boolean>;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
}
