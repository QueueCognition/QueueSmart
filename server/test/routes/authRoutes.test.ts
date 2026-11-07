import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../../src/app";
import { config } from "../../src/config/env";
import { insertUser } from "../../src/models/userStore";

const DEMO_EMAIL = "demo@queuesmart.dev";
const PROFILE_EMAIL = "route.profile@example.com";
const PASSWORD_EMAIL = "route.password@example.com";
const PASSWORD = "password123";

let server: Server;
let baseUrl = "";

before(async () => {
  insertUser({
    id: "u_demo",
    firstName: "Demo",
    lastName: "User",
    email: DEMO_EMAIL,
    password: PASSWORD,
    role: "user",
  });

  insertUser({
    id: "u_route_profile",
    firstName: "Route",
    lastName: "Profile",
    email: PROFILE_EMAIL,
    password: PASSWORD,
    role: "user",
  });

  insertUser({
    id: "u_route_password",
    firstName: "Route",
    lastName: "Password",
    email: PASSWORD_EMAIL,
    password: PASSWORD,
    role: "user",
  });

  server = createApp().listen(0);
  await once(server, "listening");

  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}${config.apiPrefix}`;
});

after(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
);

async function readBody(
  response: Response,
): Promise<Record<string, unknown> | null> {
  if (response.status === 204) return null;
  return (await response.json()) as Record<string, unknown>;
}

async function post(
  path: string,
  body: unknown,
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  return send("POST", path, body);
}

async function send(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return { status: response.status, body: await readBody(response) };
}

async function loginToken(): Promise<string> {
  return loginAs(DEMO_EMAIL, PASSWORD);
}

async function loginAs(email: string, password: string): Promise<string> {
  const { body } = await post("/auth/login", { email, password });

  return String(body?.token);
}

describe("POST /auth/login", () => {
  it("returns a session for valid credentials", async () => {
    const { status, body } = await post("/auth/login", {
      email: DEMO_EMAIL,
      password: PASSWORD,
    });

    assert.equal(status, 200);
    const user = body?.user as { id: string; email: string; role: string };
    assert.equal(user.id, "u_demo");
    assert.equal(user.email, DEMO_EMAIL);
    assert.equal(user.role, "user");
    assert.equal(typeof body?.token, "string");
    assert.ok(new Date(String(body?.expiresAt)).getTime() > Date.now());
    assert.equal(body?.boundIp, "127.0.0.1");
  });

  it("returns 401 for a wrong password", async () => {
    const { status, body } = await post("/auth/login", {
      email: DEMO_EMAIL,
      password: "wrong-password",
    });

    assert.equal(status, 401);
    assert.equal(body?.message, "Incorrect email or password");
  });

  it("returns 400 with field errors for an invalid body", async () => {
    const { status, body } = await post("/auth/login", { email: "nope" });

    assert.equal(status, 400);
    assert.equal(body?.message, "Invalid request data");
    assert.deepEqual(body?.fieldErrors, {
      email: "Enter a valid email address",
      password: "Password is required",
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });

    assert.equal(response.status, 400);
    const body = (await response.json()) as { message: string };
    assert.equal(body.message, "Malformed JSON body");
  });
});

describe("POST /auth/register", () => {
  it("creates the account and returns 201", async () => {
    const { status, body } = await post("/auth/register", {
      firstName: "Route",
      lastName: "Tester",
      email: "route.tester@example.com",
      password: PASSWORD,
    });

    assert.equal(status, 201);
    const user = body?.user as { email: string; role: string };
    assert.equal(user.email, "route.tester@example.com");
    assert.equal(user.role, "user");
    assert.equal(typeof body?.token, "string");
  });

  it("returns 409 for a duplicate email", async () => {
    const { status, body } = await post("/auth/register", {
      firstName: "Route",
      lastName: "Tester",
      email: "route.tester@example.com",
      password: PASSWORD,
    });

    assert.equal(status, 409);
    assert.equal(body?.message, "An account with this email already exists");
  });
});

describe("POST /auth/password-reset", () => {
  it("returns the cooldown and then 429 on repeat", async () => {
    const first = await post("/auth/password-reset", {
      email: "route.reset@example.com",
    });
    assert.equal(first.status, 200);
    assert.equal(first.body?.retryAfterSeconds, 60);

    const second = await post("/auth/password-reset", {
      email: "route.reset@example.com",
    });
    assert.equal(second.status, 429);
    assert.match(String(second.body?.message), /^Please wait \d+s/);
  });
});

describe("GET /auth/session", () => {
  it("returns the current user for a valid token", async () => {
    const token = await loginToken();
    const response = await fetch(`${baseUrl}/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { user: Record<string, unknown> };
    assert.equal(body.user.id, "u_demo");
    assert.equal("createdAt" in body.user, false);
  });

  it("returns 401 without a token", async () => {
    const response = await fetch(`${baseUrl}/auth/session`);

    assert.equal(response.status, 401);
    const body = (await response.json()) as { message: string };
    assert.equal(body.message, "Authentication required");
  });
});

describe("POST /auth/logout", () => {
  it("returns 204", async () => {
    const response = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
    });

    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
  });
});

describe("GET /auth/profile", () => {
  it("returns the profile for a valid token", async () => {
    const token = await loginAs(PROFILE_EMAIL, PASSWORD);
    const { status, body } = await send("GET", "/auth/profile", undefined, token);

    assert.equal(status, 200);
    assert.equal(body?.id, "u_route_profile");
    assert.equal(body?.firstName, "Route");
    assert.equal(body?.lastName, "Profile");
    assert.equal(body?.email, PROFILE_EMAIL);
    assert.equal(body?.role, "user");
    assert.equal(typeof body?.createdAt, "string");
    assert.equal("passwordHash" in (body ?? {}), false);
  });

  it("returns 401 without a token", async () => {
    const { status, body } = await send("GET", "/auth/profile");

    assert.equal(status, 401);
    assert.equal(body?.message, "Authentication required");
  });
});

describe("PATCH /auth/profile", () => {
  it("updates the names and reflects them in the session", async () => {
    const token = await loginAs(PROFILE_EMAIL, PASSWORD);
    const { status, body } = await send(
      "PATCH",
      "/auth/profile",
      { firstName: "Updated", lastName: "Person" },
      token,
    );

    assert.equal(status, 200);
    assert.equal(body?.firstName, "Updated");
    assert.equal(body?.lastName, "Person");
    assert.equal(body?.email, PROFILE_EMAIL);

    const session = await send("GET", "/auth/session", undefined, token);
    const user = session.body?.user as Record<string, unknown>;
    assert.equal(user.firstName, "Updated");
    assert.equal(user.lastName, "Person");
  });

  it("returns 400 for an empty name and keeps the other fields", async () => {
    const token = await loginAs(PROFILE_EMAIL, PASSWORD);
    const { status, body } = await send(
      "PATCH",
      "/auth/profile",
      { firstName: "" },
      token,
    );

    assert.equal(status, 400);
    assert.deepEqual(body?.fieldErrors, {
      firstName: "First name is required",
    });

    const profile = await send("GET", "/auth/profile", undefined, token);
    assert.equal(profile.body?.lastName, "Person");
  });

  it("returns 400 for an overlong name", async () => {
    const token = await loginAs(PROFILE_EMAIL, PASSWORD);
    const { status, body } = await send(
      "PATCH",
      "/auth/profile",
      { lastName: "a".repeat(51) },
      token,
    );

    assert.equal(status, 400);
    assert.deepEqual(body?.fieldErrors, {
      lastName: "Must be under 50 characters",
    });
  });

  it("returns 400 when no editable field is provided", async () => {
    const token = await loginAs(PROFILE_EMAIL, PASSWORD);
    const { status, body } = await send(
      "PATCH",
      "/auth/profile",
      { email: "another@example.com" },
      token,
    );

    assert.equal(status, 400);
    assert.equal(body?.message, "No profile changes were provided");
  });

  it("returns 401 without a token", async () => {
    const response = await fetch(`${baseUrl}/auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Nobody" }),
    });

    assert.equal(response.status, 401);
  });
});

describe("POST /auth/password-change", () => {
  it("returns 400 for a wrong current password", async () => {
    const token = await loginAs(PASSWORD_EMAIL, PASSWORD);
    const { status, body } = await send(
      "POST",
      "/auth/password-change",
      { currentPassword: "wrong-password", newPassword: "new-password456" },
      token,
    );

    assert.equal(status, 400);
    assert.deepEqual(body?.fieldErrors, {
      currentPassword: "Current password is incorrect",
    });
  });

  it("returns 400 for a short new password", async () => {
    const token = await loginAs(PASSWORD_EMAIL, PASSWORD);
    const { status, body } = await send(
      "POST",
      "/auth/password-change",
      { currentPassword: PASSWORD, newPassword: "1234567" },
      token,
    );

    assert.equal(status, 400);
    assert.deepEqual(body?.fieldErrors, {
      newPassword: "Password must be at least 8 characters",
    });
  });

  it("returns 401 without a token", async () => {
    const { status } = await send("POST", "/auth/password-change", {
      currentPassword: PASSWORD,
      newPassword: "new-password456",
    });

    assert.equal(status, 401);
  });

  it("changes the password and invalidates the old one", async () => {
    const token = await loginAs(PASSWORD_EMAIL, PASSWORD);
    const changed = await send(
      "POST",
      "/auth/password-change",
      { currentPassword: PASSWORD, newPassword: "new-password456" },
      token,
    );

    assert.equal(changed.status, 204);
    assert.equal(changed.body, null);

    const staleSession = await send("GET", "/auth/profile", undefined, token);
    assert.equal(staleSession.status, 401);
    assert.match(String(staleSession.body?.message), /password was changed/i);

    const oldLogin = await post("/auth/login", {
      email: PASSWORD_EMAIL,
      password: PASSWORD,
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await post("/auth/login", {
      email: PASSWORD_EMAIL,
      password: "new-password456",
    });
    assert.equal(newLogin.status, 200);

    const freshSession = await send(
      "GET",
      "/auth/profile",
      undefined,
      String(newLogin.body?.token),
    );
    assert.equal(freshSession.status, 200);
    assert.equal(freshSession.body?.email, PASSWORD_EMAIL);
  });
});

describe("unknown routes", () => {
  it("returns 404 for unmapped paths", async () => {
    const response = await fetch(`${baseUrl}/auth/unknown`);

    assert.equal(response.status, 404);
    const body = (await response.json()) as { message: string };
    assert.equal(body.message, "Route not found");
  });
});
