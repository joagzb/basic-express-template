import {ValidationIssue, ValidationResult} from '../shared/validation';
import {CreateUserDto, UpdateUserDto} from './user.dto';

export class UserValidator {
  public validateNewUser(user: CreateUserDto): ValidationResult<CreateUserDto> {
    const issues: ValidationIssue[] = [];

    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected object', path: 'body'}]};
    }

    const name = typeof user.name === 'string' ? user.name.trim() : undefined;
    if (user.name === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.name'});
    } else if (typeof user.name !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.name'});
    } else if (name?.length === 0) {
      issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.name'});
    }

    const surname = typeof user.surname === 'string' ? user.surname.trim() : undefined;
    if (user.surname === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.surname'});
    else if (typeof user.surname !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.surname'});
    else if (surname?.length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.surname'});

    const dateOfBirth = typeof user.dateOfBirth === 'string' ? user.dateOfBirth.trim() : undefined;
    if (user.dateOfBirth === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.dateOfBirth'});
    else if (typeof user.dateOfBirth !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.dateOfBirth'});
    else if (dateOfBirth?.length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.dateOfBirth'});
    else if (!this.isDate(dateOfBirth!)) issues.push({code: 'invalid_string', message: 'Invalid date', path: 'body.dateOfBirth'});

    const unexpected = Object.keys(user).filter(key => !['name', 'surname', 'dateOfBirth'].includes(key));
    if (unexpected.length > 0) {
      issues.push({code: 'unrecognized_keys', message: `Unrecognized key(s) in object: ${unexpected.map(key => `'${key}'`).join(', ')}`, path: 'body'});
    }

    return issues.length > 0 ? {valid: false, issues} : {valid: true, value: {name: name!, surname: surname!, dateOfBirth: dateOfBirth!}};
  }

  public validateUserUpdate(user: UpdateUserDto): ValidationResult<UpdateUserDto> {
    const issues: ValidationIssue[] = [];

    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected object', path: 'body'}]};
    }

    const value: {name?: string; surname?: string; dateOfBirth?: string} = {};
    if (Object.keys(user).length === 0) {
      issues.push({code: 'too_small', message: 'Object must contain at least 1 key(s)', path: 'body'});
    }

    if ('name' in user) {
      if (typeof user.name !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.name'});
      else if (user.name.trim().length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.name'});
      else value.name = user.name.trim();
    }

    if ('surname' in user) {
      if (typeof user.surname !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.surname'});
      else if (user.surname.trim().length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.surname'});
      else value.surname = user.surname.trim();
    }

    if ('dateOfBirth' in user) {
      if (typeof user.dateOfBirth !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.dateOfBirth'});
      else if (user.dateOfBirth.trim().length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.dateOfBirth'});
      else if (!this.isDate(user.dateOfBirth.trim())) issues.push({code: 'invalid_string', message: 'Invalid date', path: 'body.dateOfBirth'});
      else value.dateOfBirth = user.dateOfBirth.trim();
    }

    const unexpected = Object.keys(user).filter(key => !['name', 'surname', 'dateOfBirth'].includes(key));
    if (unexpected.length > 0) {
      issues.push({code: 'unrecognized_keys', message: `Unrecognized key(s) in object: ${unexpected.map(key => `'${key}'`).join(', ')}`, path: 'body'});
    }

    return issues.length > 0 ? {valid: false, issues} : {valid: true, value};
  }

  public validateId(id: string): ValidationResult<string> {
    if (typeof id !== 'string') {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Required', path: 'params.id'}]};
    }

    const value = id.trim();
    if (value.length === 0) {
      return {valid: false, issues: [{code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'params.id'}]};
    }

    return {valid: true, value};
  }

  private isDate(value: string): boolean {
    const date = new Date(`${value}T00:00:00.000Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
}
