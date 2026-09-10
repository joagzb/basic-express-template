export interface User {
  readonly id: string;
  readonly name: string;
  readonly surname: string;
  readonly dateOfBirth: string;
}

export interface NewUser {
  readonly name: string;
  readonly surname: string;
  readonly dateOfBirth: string;
}

export interface UserCredential {
  readonly user: User;
  readonly email: string;
  readonly passwordHash: string;
}

export interface NewUserCredential extends NewUser {
  readonly email: string;
  readonly passwordHash: string;
}

export type UserUpdate = Partial<NewUser>;
