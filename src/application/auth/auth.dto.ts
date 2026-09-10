export interface LoginDto {
  readonly email: string;
  readonly password: string;
}

export interface RegisterDto extends LoginDto {
  readonly name: string;
  readonly surname: string;
  readonly dateOfBirth: string;
}

export interface AuthResultDto {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
}
