import { ValidationIssue } from 'application/shared/validation';
import {CreateUserDto, UpdateUserDto} from './user.dto';

export class UserValidator {
  public validateNewUser(user: CreateUserDto): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    return issues;
  }

  public validateUserUpdate(user: UpdateUserDto): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    return issues;
  }
}