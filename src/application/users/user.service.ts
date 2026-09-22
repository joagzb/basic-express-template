import {User} from '../../domain/users/user';
import {IUserRepository} from '../../domain/users/user.repository';
import {ValidationError} from '../shared/validators/validation';
import {CreateUserDto, UpdateUserDto} from './user.dto';
import {UserValidator} from './user.validator';

export class UserService {
  private readonly validator: UserValidator;

  public constructor(private readonly usersRepository: IUserRepository) {
    this.validator = new UserValidator();
  }

  public async create(user: CreateUserDto): Promise<User> {
    const result = this.validator.validateNewUser(user);
    if (!result.valid) {
      throw new ValidationError(result.issues);
    }

    return this.usersRepository.create(result.value);
  }

  public async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  public async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  public async update(idInput: string, userInput: UpdateUserDto): Promise<User | null> {
    const user = this.validator.validateUserUpdate(userInput);
    if (!user.valid) {
      throw new ValidationError(user.issues);
    }

    return this.usersRepository.update(idInput, user.value);
  }

  public async delete(id: string): Promise<User | null> {
    return this.usersRepository.delete(id);
  }
}
