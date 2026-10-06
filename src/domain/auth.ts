export type Organisation = {
  id: string;
  name: string;
  createdAt: string;
};

export type User = {
  id: string;
  organisationId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Session = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type AuthenticatedUser = Pick<User, "id" | "organisationId" | "email">;
