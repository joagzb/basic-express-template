export interface ValidationResult {
    valid: boolean;
    details: string;
}

export class UserValidator {
    public validateNewUser(user: CreateUserDto): ValidationResult {
        // todo: implement
      }
    
      public validateUserUpdate(user: UpdateUserDto): ValidationResult {
        // todo: implement
      }
}