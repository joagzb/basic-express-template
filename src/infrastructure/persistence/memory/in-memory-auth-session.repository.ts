import {AuthSession, AuthSessionRotation, IAuthSessionRepository, SessionRotationResult} from '../../../domain/auth/auth';
import {InMemoryPersistenceState} from './in-memory-persistence.state';

/**
 * Process-local auth session storage for development and template use.
 *
 * Rotation performs one synchronous Map read/compare/write sequence before its
 * promise resolves, so concurrent calls in one process cannot both accept the
 * same refresh-token digest. Expired entries are removed lazily.
 */
export class InMemoryAuthSessionRepository implements IAuthSessionRepository {
  public readonly state: InMemoryPersistenceState;

  public constructor(stateOrNow: InMemoryPersistenceState | (() => number) = new InMemoryPersistenceState()) {
    this.state = typeof stateOrNow === 'function' ? new InMemoryPersistenceState(stateOrNow) : stateOrNow;
  }

  public assertAvailable(): Promise<void> {
    this.state.assertSessionsAvailable();
    return Promise.resolve();
  }

  public create(session: AuthSession, ttlSeconds: number): Promise<void> {
    this.state.createSession(session, ttlSeconds);
    return Promise.resolve();
  }

  public rotate(sessionId: string, expectedDigest: string, replacement: AuthSessionRotation, ttlSeconds: number): Promise<SessionRotationResult> {
    return Promise.resolve(this.state.rotateSession(sessionId, expectedDigest, replacement, ttlSeconds));
  }

  public revoke(sessionId: string): Promise<void> {
    this.state.revokeSession(sessionId);
    return Promise.resolve();
  }
}
