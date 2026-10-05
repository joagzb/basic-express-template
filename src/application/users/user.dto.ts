export interface CreateUserDto {
  readonly name: string;
  readonly surname: string;
  readonly dateOfBirth: string;
}

export type UpdateUserDto = Partial<CreateUserDto>;
