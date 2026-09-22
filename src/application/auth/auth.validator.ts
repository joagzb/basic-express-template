import {ValidationIssue, ValidationResult} from '../shared/validation';
import {LoginDto, RegisterDto} from './auth.dto';

export class AuthValidator {
  public validateLogin(credentials: LoginDto): ValidationResult<LoginDto> {
    const issues: ValidationIssue[] = [];

    if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected object', path: 'body'}]};
    }

    const email = typeof credentials.email === 'string' ? credentials.email.trim().toLowerCase() : undefined;
    if (credentials.email === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.email'});
    else if (typeof credentials.email !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.email'});
    else if (email?.length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.email'});
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!)) issues.push({code: 'invalid_string', message: 'Invalid email', path: 'body.email'});

    const password = credentials.password;
    if (password === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.password'});
    else if (typeof password !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.password'});
    else if (password.length < 6) issues.push({code: 'too_small', message: 'String must contain at least 6 character(s)', path: 'body.password'});

    const unexpected = Object.keys(credentials).filter(key => !['email', 'password'].includes(key));
    if (unexpected.length > 0) {
      issues.push({code: 'unrecognized_keys', message: `Unrecognized key(s) in object: ${unexpected.map(key => `'${key}'`).join(', ')}`, path: 'body'});
    }

    return issues.length > 0 ? {valid: false, issues} : {valid: true, value: {email: email!, password: password!}};
  }

  public validateRegistration(registration: RegisterDto): ValidationResult<RegisterDto> {
    const issues: ValidationIssue[] = [];

    if (!registration || typeof registration !== 'object' || Array.isArray(registration)) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected object', path: 'body'}]};
    }

    const name = typeof registration.name === 'string' ? registration.name.trim() : undefined;
    if (registration.name === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.name'});
    else if (typeof registration.name !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.name'});
    else if (name?.length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.name'});

    const surname = typeof registration.surname === 'string' ? registration.surname.trim() : undefined;
    if (registration.surname === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.surname'});
    else if (typeof registration.surname !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.surname'});
    else if (surname?.length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.surname'});

    const dateOfBirth = typeof registration.dateOfBirth === 'string' ? registration.dateOfBirth.trim() : undefined;
    if (registration.dateOfBirth === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.dateOfBirth'});
    else if (typeof registration.dateOfBirth !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.dateOfBirth'});
    else if (dateOfBirth?.length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.dateOfBirth'});
    else if (!this.isDate(dateOfBirth!)) issues.push({code: 'invalid_string', message: 'Invalid date', path: 'body.dateOfBirth'});

    const email = typeof registration.email === 'string' ? registration.email.trim().toLowerCase() : undefined;
    if (registration.email === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.email'});
    else if (typeof registration.email !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.email'});
    else if (email?.length === 0) issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.email'});
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!)) issues.push({code: 'invalid_string', message: 'Invalid email', path: 'body.email'});

    const password = registration.password;
    if (password === undefined) issues.push({code: 'invalid_type', message: 'Required', path: 'body.password'});
    else if (typeof password !== 'string') issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.password'});
    else if (password.length < 6) issues.push({code: 'too_small', message: 'String must contain at least 6 character(s)', path: 'body.password'});

    const unexpected = Object.keys(registration).filter(key => !['name', 'surname', 'dateOfBirth', 'email', 'password'].includes(key));
    if (unexpected.length > 0) {
      issues.push({code: 'unrecognized_keys', message: `Unrecognized key(s) in object: ${unexpected.map(key => `'${key}'`).join(', ')}`, path: 'body'});
    }

    return issues.length > 0 ? {valid: false, issues} : {valid: true, value: {name: name!, surname: surname!, dateOfBirth: dateOfBirth!, email: email!, password: password!}};
  }

  private isDate(value: string): boolean {
    const date = new Date(`${value}T00:00:00.000Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
}
