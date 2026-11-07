export type UserRole = "user" | "staff" | "admin";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
  boundIp: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface PasswordResetResult {
  retryAfterSeconds: number;
}

export interface ProfileUser extends User {
  createdAt: string;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}
