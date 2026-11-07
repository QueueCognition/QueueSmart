import { randomUUID } from "node:crypto";
import { config } from "../config/env";
import {
  PASSWORD_RESET_COOLDOWN_SECONDS,
  recordResetRequest,
  remainingCooldownSeconds,
} from "../models/passwordResetStore";
import {
  findUserByEmail,
  findUserById,
  hasUsers,
  insertUser,
  toProfileUser,
  toPublicUser,
  updateUserName,
  updateUserPassword,
  type StoredUser,
} from "../models/userStore";
import type {
  AuthSession,
  LoginInput,
  PasswordChangeInput,
  PasswordResetResult,
  ProfileUpdateInput,
  ProfileUser,
  RegisterInput,
  User,
} from "../types/auth";
import { AuthError, ValidationError } from "../utils/errors";
import { verifyPassword } from "../utils/password";
import { issueToken, verifyToken } from "../utils/token";

const INVALID_SESSION_MESSAGE =
  "Invalid or expired session. Please sign in again.";
const NETWORK_CHANGED_MESSAGE =
  "Your session ended because your network address changed. Please sign in again.";

function createSession(user: StoredUser, boundIp: string | null): AuthSession {
  const { token, expiresAt } = issueToken(
    user.id,
    user.role,
    boundIp,
    config.jwtSecret,
    config.tokenTtlSeconds,
  );

  return { user: toPublicUser(user), token, expiresAt, boundIp };
}

export async function login(
  input: LoginInput,
  boundIp: string | null,
): Promise<AuthSession> {
  const user = findUserByEmail(input.email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new AuthError("Incorrect email or password", 401);
  }

  return createSession(user, boundIp);
}

export async function register(
  input: RegisterInput,
  boundIp: string | null,
): Promise<AuthSession> {
  if (findUserByEmail(input.email)) {
    throw new AuthError("An account with this email already exists", 409);
  }

  const user = insertUser({
    id: `u_${randomUUID().slice(0, 8)}`,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    role: hasUsers() ? "user" : "admin",
  });

  return createSession(user, boundIp);
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetResult> {
  const waitSeconds = remainingCooldownSeconds(email);
  if (waitSeconds > 0) {
    throw new AuthError(
      `Please wait ${waitSeconds}s before requesting another reset link`,
      429,
    );
  }

  recordResetRequest(email);
  return { retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS };
}

export async function verifySession(
  token: string,
  boundIp: string | null,
): Promise<User> {
  let claims;

  try {
    claims = verifyToken(token, config.jwtSecret);
  } catch {
    throw new AuthError(INVALID_SESSION_MESSAGE, 401);
  }

  if (claims.ip && boundIp && claims.ip !== boundIp) {
    throw new AuthError(NETWORK_CHANGED_MESSAGE, 401);
  }

  const user = findUserById(claims.sub);
  if (!user) throw new AuthError(INVALID_SESSION_MESSAGE, 401);

  return toPublicUser(user);
}

export async function getProfile(userId: string): Promise<ProfileUser> {
  const user = findUserById(userId);
  if (!user) throw new AuthError("Authentication required", 401);

  return toProfileUser(user);
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileUser> {
  const updated = updateUserName(userId, input);
  if (!updated) throw new AuthError("Authentication required", 401);

  return toProfileUser(updated);
}

export async function changePassword(
  userId: string,
  input: PasswordChangeInput,
): Promise<void> {
  const user = findUserById(userId);
  if (!user) throw new AuthError("Authentication required", 401);

  if (!verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new ValidationError(
      { currentPassword: "Current password is incorrect" },
      "Current password is incorrect",
    );
  }

  updateUserPassword(userId, input.newPassword);
}
