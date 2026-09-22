import {NewUser, NewUserCredential, User, UserCredential, UserUpdate} from './user';

export interface IUserRepository {
  create(user: NewUser): Promise<User>;
  createCredential(credential: NewUserCredential): Promise<UserCredential | null>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findCredentialByEmail(email: string): Promise<UserCredential | null>;
  update(id: string, user: UserUpdate): Promise<User | null>;
  delete(id: string): Promise<User | null>;
}
