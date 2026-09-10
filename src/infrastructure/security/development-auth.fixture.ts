import { UserRepository } from '../../domain/users/user.repository';
import { PasswordService } from './security.service';

export const DEVELOPMENT_AUTH_CREDENTIAL = {
  email: 'developer@example.com',
  password: 'development-password',
} as const;

export const createDefaultDevelopmentAuthCredential = async (users: UserRepository, passwords: PasswordService): Promise<void> => {
  if (await users.findCredentialByEmail(DEVELOPMENT_AUTH_CREDENTIAL.email)) {
    return;
  }

  await users.createCredential({
    name: 'Development',
    surname: 'User',
    dateOfBirth: '2000-01-01',
    email: DEVELOPMENT_AUTH_CREDENTIAL.email,
    passwordHash: await passwords.hash(DEVELOPMENT_AUTH_CREDENTIAL.password),
  });
};
