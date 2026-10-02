import type {
  AuthSession,
  LoginCredentials,
  PasswordResetResult,
  RegisterDetails,
  User,
} from '../types/auth';
import { AuthError } from './authError';
import { getClientIp } from './ipService';

export const DEMO_CREDENTIALS = {
  email: 'demo@queuesmart.dev',
  password: 'password123',
} as const;

export const ADMIN_CREDENTIALS = {
  email: 'admin@queuesmart.dev',
  password: 'password123',
} as const;

const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
const ACCOUNTS_KEY = 'queuesmart.mock.accounts';
const RESET_TIMES_KEY = 'queuesmart.mock.reset-times';

export async function mockLogin({ email, password }: LoginCredentials): Promise<AuthSession> {
  const [boundIp] = await Promise.all([getClientIp(), delay(600)]);

  const normalizedEmail = email.trim().toLowerCase();
  const matchesDemoAccount =
    normalizedEmail === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password;

  const matchesAdminAccount =
    normalizedEmail === ADMIN_CREDENTIALS.email &&
    password === ADMIN_CREDENTIALS.password;

  if (!matchesDemoAccount && !matchesAdminAccount) {
    throw new AuthError('Incorrect email or password', 401);
  }

  const user: User = matchesAdminAccount
    ? {
        id: 'u_admin',
        firstName: 'Admin',
        lastName: 'Manager',
        email: normalizedEmail,
        role: 'admin',
      }
    : {
        id: 'u_demo',
        firstName: 'Demo',
        lastName: 'User',
        email: normalizedEmail,
        role: 'user',
      };

  return createSession(user, boundIp);
}

export async function mockRegister(details: RegisterDetails): Promise<AuthSession> {
  const email = details.email.trim().toLowerCase();
  const [boundIp] = await Promise.all([getClientIp(), delay(700)]);

  if (accountExists(email)) {
    throw new AuthError('An account with this email already exists', 409);
  }

  rememberAccount(email);

  const user: User = {
    id: `u_${crypto.randomUUID().slice(0, 8)}`,
    firstName: details.firstName.trim(),
    lastName: details.lastName.trim(),
    email,
    role: 'user',
  };

  return createSession(user, boundIp);
}

export async function mockRequestPasswordReset(email: string): Promise<PasswordResetResult> {
  const normalized = email.trim().toLowerCase();
  await delay(500);

  const waitSeconds = remainingCooldown(normalized);
  if (waitSeconds > 0) {
    throw new AuthError(`Please wait ${waitSeconds}s before requesting another reset link`, 429);
  }

  recordResetRequest(normalized);
  return { retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS };
}

export async function mockLogout(): Promise<void> {
  await delay(150);
}

function accountExists(email: string): boolean {
  return email === DEMO_CREDENTIALS.email || readAccounts().includes(email);
}

function rememberAccount(email: string) {
  const accounts = readAccounts();
  if (accounts.includes(email)) return;
  writeJson(ACCOUNTS_KEY, [...accounts, email]);
}

function remainingCooldown(email: string): number {
  const lastSentAt = readResetTimes()[email] ?? 0;
  const elapsedSeconds = Math.floor((Date.now() - lastSentAt) / 1000);
  return Math.max(0, PASSWORD_RESET_COOLDOWN_SECONDS - elapsedSeconds);
}

function recordResetRequest(email: string) {
  writeJson(RESET_TIMES_KEY, { ...readResetTimes(), [email]: Date.now() });
}

function readAccounts(): string[] {
  const parsed = readJson(ACCOUNTS_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === 'string');
}

function readResetTimes(): Record<string, number> {
  const parsed = readJson(RESET_TIMES_KEY);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  return parsed as Record<string, number>;
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createSession(user: User, boundIp: string | null): AuthSession {
  return {
    user,
    token: `mock.${crypto.randomUUID()}`,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    boundIp,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
