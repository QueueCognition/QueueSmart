import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../../src/app";
import { config } from "../../src/config/env";
import { seedMockAccounts } from "../../src/db/seed";

const DEMO_EMAIL = "demo@queuesmart.dev";
const PASSWORD = "password123";

let server: Server;
let baseUrl = "";

before(async () => {
  seedMockAccounts();
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
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { status: response.status, body: await readBody(response) };
}

async function loginToken(): Promise<string> {
  const { body } = await post("/auth/login", {
    email: DEMO_EMAIL,
    password: PASSWORD,
  });

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
    const body = (await response.json()) as { user: { id: string } };
    assert.equal(body.user.id, "u_demo");
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

describe("unknown routes", () => {
  it("returns 404 for unmapped paths", async () => {
    const response = await fetch(`${baseUrl}/auth/unknown`);

    assert.equal(response.status, 404);
    const body = (await response.json()) as { message: string };
    assert.equal(body.message, "Route not found");
  });
});
