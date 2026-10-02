export type UserRole = "user" | "staff" | "admin";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterDetails {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface PasswordResetResult {
  retryAfterSeconds: number;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
  boundIp: string | null;
}
