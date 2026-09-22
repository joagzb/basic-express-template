import {randomUUID} from 'node:crypto';
import {NewUser, NewUserCredential, User, UserCredential, UserUpdate} from '../../../domain/users/user';
import {IUserRepository} from '../../../domain/users/user.repository';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();
  private readonly credentials = new Map<string, UserCredential>();

  public async create(input: NewUser): Promise<User> {
    const user: User = {id: randomUUID(), ...input};
    this.users.set(user.id, user);
    
    return user;
  }

  public async createCredential(input: NewUserCredential): Promise<UserCredential | null> {
    const {email, passwordHash, ...userInput} = input;
    const normalizedEmail = email.toLowerCase();
    if (this.credentials.has(normalizedEmail)) {
      return null;
    }

    const user: User = {id: randomUUID(), ...userInput};
    const credential = {user, email: normalizedEmail, passwordHash};

    this.users.set(user.id, user);
    this.credentials.set(normalizedEmail, credential);

    return credential;
  }

  public async findAll(): Promise<User[]> {
    return [...this.users.values()];
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  public async findCredentialByEmail(email: string): Promise<UserCredential | null> {
    return this.credentials.get(email.toLowerCase()) ?? null;
  }

  public async update(id: string, input: UserUpdate): Promise<User | null> {
    const current = this.users.get(id);
    if (!current) {
      return null;
    }

    const user = {...current, ...input};
    this.users.set(id, user);

    return user;
  }

  public async delete(id: string): Promise<User | null> {
    const user = this.users.get(id) ?? null;
    if (user) {
      this.users.delete(id);
      for (const [email, credential] of this.credentials) {
        if (credential.user.id === id) {
          this.credentials.delete(email);
        }
      }
    }

    return user;
  }
}
