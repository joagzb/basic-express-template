import {NewUser, NewUserCredential, User, UserCredential, UserUpdate} from '../../domain/users/user';
import {IUserRepository} from '../../domain/users/user.repository';
import {KeyValue, RedisOperations} from '../cache/redis.interface';
import {ILoggerService} from '../logging/logger.interface';

const USERS_KEY = 'users:all';

export class CachedUserRepository implements IUserRepository {
  public constructor(
    private readonly repository: IUserRepository,
    private readonly cache: RedisOperations,
    private readonly logger: ILoggerService,
    private readonly ttlSeconds: number,
  ) {}

  public async create(user: NewUser): Promise<User> {
    const created = await this.repository.create(user);
    await this.invalidate(created.id);

    return created;
  }

  public async createCredential(credential: NewUserCredential): Promise<UserCredential | null> {
    const created = await this.repository.createCredential(credential);
    if (created) {
      await this.invalidate(created.user.id);
    }

    return created;
  }

  public async findAll(): Promise<User[]> {
    const cached = await this.read(USERS_KEY);
    if (Array.isArray(cached) && cached.every(isUser)) {
      return cached;
    }

    const users = await this.repository.findAll();
    await this.write(USERS_KEY, users);

    return users;
  }

  public async findById(id: string): Promise<User | null> {
    const key = this.userKey(id);
    const cached = await this.read(key);
    if (isUser(cached)) {
      return cached;
    }

    const user = await this.repository.findById(id);
    if (user) {
      await this.write(key, user);
    }

    return user;
  }

  public findCredentialByEmail(email: string): Promise<UserCredential | null> {
    return this.repository.findCredentialByEmail(email);
  }

  public async update(id: string, user: UserUpdate): Promise<User | null> {
    const updated = await this.repository.update(id, user);
    if (updated) {
      await this.invalidate(id);
    }

    return updated;
  }

  public async delete(id: string): Promise<User | null> {
    const deleted = await this.repository.delete(id);
    if (deleted) {
      await this.invalidate(id);
    }

    return deleted;
  }

  private async read(key: string): Promise<unknown> {
    try {
      return await this.cache.get(key);
    } catch (error) {
      this.logger.warn({error, key}, 'User cache read failed; using authoritative persistence');
      return null;
    }
  }

  private async write(key: string, value: User | User[]): Promise<void> {
    try {
      const serializable: KeyValue = Array.isArray(value) ? value.map(user => ({...user})) : {...value};
      await this.cache.set(key, serializable, this.ttlSeconds);
    } catch (error) {
      this.logger.warn({error, key}, 'User cache write failed; continuing with authoritative persistence');
    }
  }

  private async invalidate(id: string): Promise<void> {
    await Promise.all([this.remove(USERS_KEY), this.remove(this.userKey(id))]);
  }

  private async remove(key: string): Promise<void> {
    try {
      await this.cache.delete(key);
    } catch (error) {
      this.logger.warn({error, key}, 'User cache invalidation failed; authoritative write remains successful');
    }
  }

  private userKey(id: string): string {
    return `users:by-id:${id}`;
  }
}

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const user = value as Record<string, unknown>;
  
  return typeof user.id === 'string' && typeof user.name === 'string' && typeof user.surname === 'string' && typeof user.dateOfBirth === 'string';
};
