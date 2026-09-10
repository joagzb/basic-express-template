export interface AccessTokenPayload {
  readonly sub: string;
}

export interface AccessTokenService {
  sign(subject: string): string;
  verify(token: string): AccessTokenPayload;
}

export interface PasswordVerifier {
  compare(password: string, hash: string): Promise<boolean>;
}
