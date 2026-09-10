import {NewUser, User, UserUpdate} from '../../domain/users/user';
import {UserRepository} from '../../domain/users/user.repository';

export class UserService {
  public constructor(private readonly users: UserRepository) {}

  public create(user: NewUser): Promise<User> {
    return this.users.create(user);
  }

  public findAll(): Promise<User[]> {
    return this.users.findAll();
  }

  public findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  public update(id: string, user: UserUpdate): Promise<User | null> {
    return this.users.update(id, user);
  }

  public delete(id: string): Promise<User | null> {
    return this.users.delete(id);
  }

  public calculateAge(dateOfBirth: string, today = new Date()): number {
    const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const beforeBirthday = today.getUTCMonth() < birthDate.getUTCMonth() || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age;
  }
}
