import type Database from "better-sqlite3";
import type { Organisation, Session, User } from "../domain/auth.js";

export class AuthRepository {
  constructor(private readonly database: Database.Database) {}

  createOrganisation(organisation: Organisation): Organisation {
    this.database.prepare(
      "INSERT INTO organisations (id, name, created_at) VALUES (@id, @name, @createdAt)"
    ).run(organisation);
    return organisation;
  }

  createUser(user: User): User {
    this.database.prepare(
      "INSERT INTO users (id, organisation_id, email, password_hash, created_at) VALUES (@id, @organisationId, @email, @passwordHash, @createdAt)"
    ).run(user);
    return user;
  }

  getUserByEmail(email: string): User | undefined {
    return this.database.prepare(
      "SELECT id, organisation_id as organisationId, email, password_hash as passwordHash, created_at as createdAt FROM users WHERE email = ?"
    ).get(email) as User | undefined;
  }

  getUserById(id: string): User | undefined {
    return this.database.prepare(
      "SELECT id, organisation_id as organisationId, email, password_hash as passwordHash, created_at as createdAt FROM users WHERE id = ?"
    ).get(id) as User | undefined;
  }

  createSession(session: Session): void {
    this.database.prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (@tokenHash, @userId, @expiresAt, @createdAt)"
    ).run(session);
  }

  getSessionUser(tokenHash: string, now: string): User | undefined {
    return this.database.prepare(
      `SELECT u.id, u.organisation_id as organisationId, u.email, u.password_hash as passwordHash, u.created_at as createdAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    ).get(tokenHash, now) as User | undefined;
  }

  deleteSession(tokenHash: string): void {
    this.database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }
}
