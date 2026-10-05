import {Repository} from 'typeorm';
import {NewUser, NewUserCredential, User, UserCredential, UserUpdate} from '../../../../domain/users/user';
import {IUserRepository} from '../../../../domain/users/user.repository';
import {UserEntity} from '../entities/user.entity';

export class TypeOrmUserRepository implements IUserRepository {
  public constructor(private readonly repository: Repository<UserEntity>) {}

  public async create(input: NewUser): Promise<User> {
    return this.toUser(await this.repository.save(this.repository.create(input)));
  }

  public async createCredential(input: NewUserCredential): Promise<UserCredential | null> {
    const credential = {...input, email: input.email.toLowerCase()};

    try {
      const entity = await this.repository.save(this.repository.create(credential));
      return {user: this.toUser(entity), email: credential.email, passwordHash: credential.passwordHash};
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        return null;
      }
      throw error;
    }
  }

  public async findAll(): Promise<User[]> {
    return (await this.repository.find()).map(user => this.toUser(user));
  }

  public async findById(id: string): Promise<User | null> {
    const user = await this.repository.findOneBy({id});
    return user ? this.toUser(user) : null;
  }

  public async findCredentialByEmail(email: string): Promise<UserCredential | null> {
    const entity = await this.repository.findOne({
      where: {email: email.toLowerCase()},
      select: {id: true, name: true, surname: true, dateOfBirth: true, email: true, passwordHash: true},
    });

    if (!entity?.email || !entity.passwordHash) {
      return null;
    }

    return {user: this.toUser(entity), email: entity.email, passwordHash: entity.passwordHash};
  }

  public async update(id: string, input: UserUpdate): Promise<User | null> {
    const user = await this.repository.findOneBy({id});
    return user ? this.toUser(await this.repository.save(this.repository.merge(user, input))) : null;
  }

  public async delete(id: string): Promise<User | null> {
    const user = await this.repository.findOneBy({id});
    if (!user) {
      return null;
    }

    await this.repository.remove(user);

    return this.toUser(user);
  }

  private toUser(entity: UserEntity): User {
    return {id: entity.id, name: entity.name, surname: entity.surname, dateOfBirth: entity.dateOfBirth};
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const databaseError = error as {code?: unknown; driverError?: {code?: unknown}};

    return databaseError.code === '23505' || databaseError.driverError?.code === '23505';
  }
}
