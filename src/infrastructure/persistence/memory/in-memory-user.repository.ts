import {NewUser, NewUserCredential, User, UserCredential, UserUpdate} from '../../../domain/users/user';
import {IUserRepository} from '../../../domain/users/user.repository';
import {InMemoryPersistenceState} from './in-memory-persistence.state';

export class InMemoryUserRepository implements IUserRepository {
  public constructor(public readonly state: InMemoryPersistenceState = new InMemoryPersistenceState()) {}

  public async create(input: NewUser): Promise<User> {
    return this.state.createUser(input);
  }

  public async createCredential(input: NewUserCredential): Promise<UserCredential | null> {
    return this.state.createCredential(input);
  }

  public async findAll(): Promise<User[]> {
    return this.state.findAllUsers();
  }

  public async findById(id: string): Promise<User | null> {
    return this.state.findUserById(id);
  }

  public async findCredentialByEmail(email: string): Promise<UserCredential | null> {
    return this.state.findCredentialByEmail(email);
  }

  public async update(id: string, input: UserUpdate): Promise<User | null> {
    return this.state.updateUser(id, input);
  }

  public async delete(id: string): Promise<User | null> {
    return this.state.deleteUser(id);
  }
}
