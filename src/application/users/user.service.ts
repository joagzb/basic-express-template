import {User} from '../../domain/users/user';
import {UserRepository} from '../../domain/users/user.repository';
import {UserValidator} from './user.validator';
import {ValidationError} from '../shared/validation';
import {CreateUserDto, UpdateUserDto} from './user.dto';

export class UserService {
  private readonly validator: UserValidator;

  public constructor(private readonly users: UserRepository) {
    this.validator = new UserValidator();
  }

  public async create(user: CreateUserDto): Promise<User> {
    const result = this.validator.validateNewUser(user);
    if (!result.valid) throw new ValidationError(result.issues);
    return this.users.create(result.value);
  }

  public async findAll(): Promise<User[]> {
    return this.users.findAll();
  }

  public async findById(id: string): Promise<User | null> {
    const result = this.validator.validateId(id);
    if (!result.valid) throw new ValidationError(result.issues);
    return this.users.findById(result.value);
  }

  public async update(idInput: string, userInput: UpdateUserDto): Promise<User | null> {
    const id = this.validator.validateId(idInput);
    if (!id.valid) throw new ValidationError(id.issues);
    const user = this.validator.validateUserUpdate(userInput);
    if (!user.valid) throw new ValidationError(user.issues);
    return this.users.update(id.value, user.value);
  }

  public async delete(id: string): Promise<User | null> {
    const result = this.validator.validateId(id);
    if (!result.valid) throw new ValidationError(result.issues);
    return this.users.delete(result.value);
  }
}
