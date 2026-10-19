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
  insertUser,
  toPublicUser,
  type StoredUser,
} from "../models/userStore";
import type {
  AuthSession,
  LoginInput,
  PasswordResetResult,
  RegisterInput,
  User,
} from "../types/auth";
import { AuthError } from "../utils/errors";
import { verifyPassword } from "../utils/password";
import { issueToken, verifyToken } from "../utils/token";

const INVALID_SESSION_MESSAGE = "Invalid or expired session. Please sign in again.";
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
    role: "user",
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
