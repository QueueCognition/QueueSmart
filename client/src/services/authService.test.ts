import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "../services/authError";
import * as authService from "../services/authService";

type Call = { url: string; init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (call: Call) => Response) {
  const calls: Call[] = [];
  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal("fetch", stub);
  return calls;
}

const SESSION = {
  user: {
    id: "u1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    role: "user",
  },
  token: "token-123",
  expiresAt: "2099-01-01T00:00:00.000Z",
  boundIp: null,
};

function storeSession(session: unknown) {
  localStorage.setItem(
    authService.AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts credentials to /auth/login", async () => {
    const calls = mockFetch(() => jsonResponse(SESSION));

    const session = await authService.login({
      email: "ada@example.com",
      password: "secret123",
      remember: true,
    });

    expect(session.token).toBe("token-123");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/auth\/login$/);
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      email: "ada@example.com",
      password: "secret123",
    });
    expect(new Headers(calls[0].init.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("sends a bearer token for authenticated profile reads", async () => {
    storeSession({ ...SESSION, token: "stored-token" });

    const calls = mockFetch(() =>
      jsonResponse({ ...SESSION.user, createdAt: "2020-01-01T00:00:00.000Z" }),
    );

    await authService.getProfile();

    expect(calls[0].url).toMatch(/\/auth\/profile$/);
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBe(
      "Bearer stored-token",
    );
  });

  it("maps error payloads onto AuthError with field errors", async () => {
    mockFetch(() =>
      jsonResponse(
        {
          message: "Invalid request data",
          fieldErrors: { email: "Email is required" },
        },
        400,
      ),
    );

    await expect(
      authService.login({
        email: "ada@example.com",
        password: "secret123",
        remember: false,
      }),
    ).rejects.toMatchObject({
      name: "AuthError",
      status: 400,
      message: "Invalid request data",
      fieldErrors: { email: "Email is required" },
    });
  });

  it("reports an unreachable server as status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    const error = await authService
      .login({
        email: "ada@example.com",
        password: "secret123",
        remember: false,
      })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(0);
    expect((error as AuthError).message).toBe(
      "Unable to reach the server. Please try again.",
    );
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch(() => new Response(null, { status: 204 }));

    await expect(authService.logout()).resolves.toBeUndefined();
  });
});
