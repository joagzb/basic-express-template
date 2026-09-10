import {User} from '../../domain/users/user';
import {UserRepository} from '../../domain/users/user.repository';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { UserValidator } from './user.validator';

export class UserService {
  private readonly validator: UserValidator

  public constructor(
    private readonly users: UserRepository
  ) {
    this.validator = new UserValidator();
  }

  public async create(user: CreateUserDto): Promise<User> {
    const validationResult = this.validator.validateNewUser(user);
    return this.users.create(user);
  }

  public async findAll(): Promise<User[]> {
    return this.users.findAll();
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  public async update(id: string, user: UpdateUserDto): Promise<User | null> {
    const validationResult = this.validator.validateUserUpdate(user);
    return this.users.update(id, user);
  }

  public async delete(id: string): Promise<User | null> {
    return this.users.delete(id);
  }
}
