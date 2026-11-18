import type { AuthSession } from "../types/auth";

export const AUTH_SESSION_STORAGE_KEY = "queuesmart.auth.session";

export function readSession(): AuthSession | null {
  const raw =
    localStorage.getItem(AUTH_SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function persistSession(session: AuthSession, remember: boolean): void {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function sessionIsPersistent(): boolean {
  return localStorage.getItem(AUTH_SESSION_STORAGE_KEY) !== null;
}

export function getAccessToken(): string | null {
  const raw =
    localStorage.getItem(AUTH_SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Partial<AuthSession>;
    return typeof session.token === "string" ? session.token : null;
  } catch {
    return null;
  }
}
