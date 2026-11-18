import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import type { AuthSession } from "../types/auth";
import {
  AUTH_SESSION_STORAGE_KEY,
  clearSession,
  getAccessToken,
  persistSession,
  readSession,
  sessionIsPersistent,
} from "./session";

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 1000).toISOString();

const session: AuthSession = {
  token: "token-123",
  user: {
    id: "u1",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    role: "user",
  },
  expiresAt: FUTURE,
  boundIp: null,
};

describe("session storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when nothing is stored", () => {
    expect(readSession()).toBeNull();
  });

  it("persists to localStorage when remember is true", () => {
    persistSession(session, true);

    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(readSession()).toEqual(session);
  });

  it("persists to sessionStorage when remember is false", () => {
    persistSession(session, false);

    expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("reports whether the session survives a restart", () => {
    persistSession(session, true);
    expect(sessionIsPersistent()).toBe(true);

    persistSession(session, false);
    expect(sessionIsPersistent()).toBe(false);
  });

  it("replaces a previous session in the other storage", () => {
    persistSession(session, true);
    persistSession({ ...session, token: "newer" }, false);

    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(readSession()?.token).toBe("newer");
  });

  it("drops an expired session and clears it", () => {
    persistSession({ ...session, expiresAt: PAST }, true);

    expect(readSession()).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("discards corrupt json instead of throwing", () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, "{not json");

    expect(readSession()).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("clears both storages", () => {
    persistSession(session, true);
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));

    clearSession();

    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });
});

describe("getAccessToken", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("reads the token from either storage", () => {
    persistSession(session, true);
    expect(getAccessToken()).toBe("token-123");

    persistSession(session, false);
    expect(getAccessToken()).toBe("token-123");
  });

  it("returns null without a session", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("returns null when the token is not a string", () => {
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({ user: session.user, expiresAt: FUTURE }),
    );

    expect(getAccessToken()).toBeNull();
  });

  it("returns null for corrupt json", () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, "nope");

    expect(getAccessToken()).toBeNull();
  });
});
