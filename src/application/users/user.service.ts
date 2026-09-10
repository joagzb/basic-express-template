import {User} from '../../domain/users/user';
import {UserRepository} from '../../domain/users/user.repository';
import { UserValidator } from './user.validator';

export class UserService {
  public constructor(private readonly users: UserRepository, private readonly validator: UserValidator) {}

  public async create(user: CreateUserDto): Promise<User> {
    const validationResult = this.validator.validateNewUser(user);

    // todo: we are missing the CreateUserDto, but dont know where to place it to not break the clean architecture, and also dont know what to do with user.ts at the domain/users/user.ts
    // todo: if validationResult is false, then return an exception and dont create the user

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
    // todo: if validationResult is false, then return an exception and dont create the user
    
    return this.users.update(id, user);
  }

  public async delete(id: string): Promise<User | null> {
    return this.users.delete(id);
  }

}
