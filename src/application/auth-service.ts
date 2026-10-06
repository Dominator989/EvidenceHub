import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { AuthenticatedUser } from "../domain/auth.js";
import { AuthRepository } from "../infrastructure/auth-repository.js";

const SESSION_DAYS = 7;

function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  register(input: { organisationName: string; email: string; password: string }): { user: AuthenticatedUser; token: string } {
    const email = input.email.trim().toLowerCase();
    if (input.password.length < 12) throw new Error("Password must be at least 12 characters");
    if (this.repository.getUserByEmail(email)) throw new Error("An account with that email already exists");
    const now = new Date().toISOString();
    const organisation = this.repository.createOrganisation({ id: randomUUID(), name: input.organisationName.trim(), createdAt: now });
    const user = this.repository.createUser({ id: randomUUID(), organisationId: organisation.id, email, passwordHash: hashPassword(input.password), createdAt: now });
    return { user: this.publicUser(user), token: this.createSession(user.id) };
  }

  login(input: { email: string; password: string }): { user: AuthenticatedUser; token: string } {
    const user = this.repository.getUserByEmail(input.email.trim().toLowerCase());
    if (!user || !verifyPassword(input.password, user.passwordHash)) throw new Error("Invalid email or password");
    return { user: this.publicUser(user), token: this.createSession(user.id) };
  }

  authenticate(token: string | undefined): AuthenticatedUser | undefined {
    if (!token) return undefined;
    const user = this.repository.getSessionUser(hashSessionToken(token), new Date().toISOString());
    return user ? this.publicUser(user) : undefined;
  }

  logout(token: string | undefined): void {
    if (token) this.repository.deleteSession(hashSessionToken(token));
  }

  private createSession(userId: string): string {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    this.repository.createSession({ tokenHash: hashSessionToken(token), userId, expiresAt, createdAt: new Date().toISOString() });
    return token;
  }

  private publicUser(user: { id: string; organisationId: string; email: string }): AuthenticatedUser {
    return { id: user.id, organisationId: user.organisationId, email: user.email };
  }
}
