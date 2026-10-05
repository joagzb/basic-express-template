import {IAuthRegistrationRepository, InitialAuthSession} from '../../../domain/auth/auth';
import {NewUserCredential, UserCredential} from '../../../domain/users/user';
import {InMemoryPersistenceState} from './in-memory-persistence.state';

export class InMemoryAuthRegistrationRepository implements IAuthRegistrationRepository {
  public constructor(private readonly state: InMemoryPersistenceState = new InMemoryPersistenceState()) {}

  public create(credential: NewUserCredential, session: InitialAuthSession, ttlSeconds: number): Promise<UserCredential | null> {
    return Promise.resolve(this.state.createRegistration(credential, session, ttlSeconds));
  }
}
