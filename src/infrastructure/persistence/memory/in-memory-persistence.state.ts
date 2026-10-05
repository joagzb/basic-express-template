import {randomUUID} from 'node:crypto';
import {AuthSession, AuthSessionRotation, InitialAuthSession, SessionRotationResult} from '../../../domain/auth/auth';
import {NewUser, NewUserCredential, User, UserCredential, UserUpdate} from '../../../domain/users/user';

interface InMemoryAuthSessionRecord {
  readonly session: AuthSession;
  readonly expiresAtMs: number;
}

export class InMemoryPersistenceState {
  private users = new Map<string, User>();
  private credentials = new Map<string, UserCredential>();
  private sessions = new Map<string, InMemoryAuthSessionRecord>();

  public constructor(private readonly now: () => number = Date.now) {}

  public createUser(input: NewUser): User {
    const user: User = {id: randomUUID(), ...input};
    this.users.set(user.id, user);
    return user;
  }

  public createCredential(input: NewUserCredential): UserCredential | null {
    const normalizedEmail = input.email.toLowerCase();
    if (this.credentials.has(normalizedEmail)) {
      return null;
    }

    const user: User = {id: randomUUID(), name: input.name, surname: input.surname, dateOfBirth: input.dateOfBirth};
    const credential = {user, email: normalizedEmail, passwordHash: input.passwordHash};
    this.users.set(user.id, user);
    this.credentials.set(normalizedEmail, credential);
    return credential;
  }

  public createRegistration(input: NewUserCredential, session: InitialAuthSession, ttlSeconds: number): UserCredential | null {
    this.removeExpiredSessions();
    const normalizedEmail = input.email.toLowerCase();
    if (this.credentials.has(normalizedEmail)) {
      return null;
    }

    const expiresAtMs = this.expiryDeadline(session.expiresAt, ttlSeconds);
    if (this.sessions.has(session.id)) {
      throw new Error(`Auth session ${session.id} already exists`);
    }

    const user: User = {id: randomUUID(), name: input.name, surname: input.surname, dateOfBirth: input.dateOfBirth};
    const credential = {user, email: normalizedEmail, passwordHash: input.passwordHash};
    const storedSession = {session: {...session, userId: user.id}, expiresAtMs};

    const nextUsers = new Map(this.users).set(user.id, user);
    const nextCredentials = new Map(this.credentials).set(normalizedEmail, credential);
    const nextSessions = new Map(this.sessions).set(session.id, storedSession);
    this.users = nextUsers;
    this.credentials = nextCredentials;
    this.sessions = nextSessions;

    return credential;
  }

  public findAllUsers(): User[] {
    return [...this.users.values()];
  }

  public findUserById(id: string): User | null {
    return this.users.get(id) ?? null;
  }

  public findCredentialByEmail(email: string): UserCredential | null {
    return this.credentials.get(email.toLowerCase()) ?? null;
  }

  public updateUser(id: string, input: UserUpdate): User | null {
    const current = this.users.get(id);
    if (!current) {
      return null;
    }

    const user = {...current, ...input};
    this.users.set(id, user);
    return user;
  }

  public deleteUser(id: string): User | null {
    const user = this.users.get(id) ?? null;
    if (!user) {
      return null;
    }

    this.users.delete(id);
    for (const [email, credential] of this.credentials) {
      if (credential.user.id === id) {
        this.credentials.delete(email);
      }
    }
    return user;
  }

  public assertSessionsAvailable(): void {
    this.removeExpiredSessions();
  }

  public createSession(session: AuthSession, ttlSeconds: number): void {
    this.removeExpiredSessions();
    this.sessions.set(session.id, {session: {...session}, expiresAtMs: this.expiryDeadline(session.expiresAt, ttlSeconds)});
  }

  public rotateSession(sessionId: string, expectedDigest: string, replacement: AuthSessionRotation, ttlSeconds: number): SessionRotationResult {
    const stored = this.sessions.get(sessionId);
    if (!stored || this.isExpired(stored)) {
      this.sessions.delete(sessionId);
      return {status: 'missing'};
    }

    if (stored.session.refreshTokenDigest !== expectedDigest) {
      this.sessions.delete(sessionId);
      return {status: 'reused'};
    }

    this.sessions.set(sessionId, {
      session: {...stored.session, ...replacement},
      expiresAtMs: this.expiryDeadline(replacement.expiresAt, ttlSeconds),
    });
    return {status: 'rotated', userId: stored.session.userId};
  }

  public revokeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private expiryDeadline(expiresAt: string, ttlSeconds: number): number {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new TypeError('Auth session TTL must be a positive integer in seconds');
    }

    const metadataExpiry = Date.parse(expiresAt);
    if (Number.isNaN(metadataExpiry)) {
      throw new TypeError('Auth session expiry must be a valid ISO date');
    }

    return Math.min(metadataExpiry, this.now() + ttlSeconds * 1000);
  }

  private isExpired(stored: InMemoryAuthSessionRecord): boolean {
    return stored.expiresAtMs <= this.now();
  }

  private removeExpiredSessions(): void {
    for (const [sessionId, stored] of this.sessions) {
      if (this.isExpired(stored)) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
