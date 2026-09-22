import {ValidationIssue, ValidationResult} from 'application/shared/validators/validation.interface';
import {CommonValidator} from '../shared/validators/common.validator';
import {LoginDto, RefreshDto, RegisterDto} from './auth.dto';

export class AuthValidator {
  private readonly commonValidator = new CommonValidator();

  public validateLogin(credentials: LoginDto): ValidationResult<LoginDto> {
    const issues: ValidationIssue[] = [];

    if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected object', path: 'body'}]};
    }
    const email = typeof credentials.email === 'string' ? credentials.email.trim().toLowerCase() : undefined;
    if (credentials.email === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.email'});
    } else if (typeof credentials.email !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.email'});
    } else if (email?.length === 0) {
      issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.email'});
    } else if (!this.commonValidator.isEmail(email!)) {
      issues.push({code: 'invalid_string', message: 'Invalid email', path: 'body.email'});
    }

    const password = credentials.password;
    if (password === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.password'});
    } else if (typeof password !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.password'});
    } else if (password.length < 6) {
      issues.push({code: 'too_small', message: 'String must contain at least 6 character(s)', path: 'body.password'});
    }

    return issues.length > 0 ? {valid: false, issues} : {valid: true, value: {email: email!, password: password!}};
  }

  public validateRefresh(input: RefreshDto): ValidationResult<RefreshDto> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected object', path: 'body'}]};
    }

    const keys = Object.keys(input);
    if (keys.some(key => key !== 'refreshToken')) {
      return {valid: false, issues: [{code: 'unrecognized_key', message: 'Unexpected property', path: 'body'}]};
    }

    if (input.refreshToken === undefined) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Required', path: 'body.refreshToken'}]};
    }
    if (typeof input.refreshToken !== 'string') {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected string', path: 'body.refreshToken'}]};
    }
    if (input.refreshToken.length === 0) {
      return {valid: false, issues: [{code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.refreshToken'}]};
    }

    return {valid: true, value: {refreshToken: input.refreshToken}};
  }

  public validateRegistration(registration: RegisterDto): ValidationResult<RegisterDto> {
    const issues: ValidationIssue[] = [];

    if (!registration || typeof registration !== 'object' || Array.isArray(registration)) {
      return {valid: false, issues: [{code: 'invalid_type', message: 'Expected object', path: 'body'}]};
    }
    const name = typeof registration.name === 'string' ? registration.name.trim() : undefined;
    if (registration.name === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.name'});
    } else if (typeof registration.name !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.name'});
    } else if (name?.length === 0) {
      issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.name'});
    }

    const surname = typeof registration.surname === 'string' ? registration.surname.trim() : undefined;
    if (registration.surname === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.surname'});
    } else if (typeof registration.surname !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.surname'});
    } else if (surname?.length === 0) {
      issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.surname'});
    }

    const dateOfBirth = typeof registration.dateOfBirth === 'string' ? registration.dateOfBirth.trim() : undefined;
    if (registration.dateOfBirth === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.dateOfBirth'});
    } else if (typeof registration.dateOfBirth !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.dateOfBirth'});
    } else if (dateOfBirth?.length === 0) {
      issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.dateOfBirth'});
    } else if (!this.commonValidator.isDate(dateOfBirth!)) {
      issues.push({code: 'invalid_string', message: 'Invalid date', path: 'body.dateOfBirth'});
    }

    const email = typeof registration.email === 'string' ? registration.email.trim().toLowerCase() : undefined;
    if (registration.email === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.email'});
    } else if (typeof registration.email !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.email'});
    } else if (email?.length === 0) {
      issues.push({code: 'too_small', message: 'String must contain at least 1 character(s)', path: 'body.email'});
    } else if (!this.commonValidator.isEmail(email!)) {
      issues.push({code: 'invalid_string', message: 'Invalid email', path: 'body.email'});
    }

    const password = registration.password;
    if (password === undefined) {
      issues.push({code: 'invalid_type', message: 'Required', path: 'body.password'});
    } else if (typeof password !== 'string') {
      issues.push({code: 'invalid_type', message: 'Expected string', path: 'body.password'});
    } else if (password.length < 6) {
      issues.push({code: 'too_small', message: 'String must contain at least 6 character(s)', path: 'body.password'});
    }

    return issues.length > 0 ? {valid: false, issues} : {valid: true, value: {name: name!, surname: surname!, dateOfBirth: dateOfBirth!, email: email!, password: password!}};
  }
}
