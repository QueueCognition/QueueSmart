import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { config } from "../../src/config/env";
import { seedMockAccounts } from "../../src/db/seed";
import { findUserByEmail } from "../../src/models/userStore";
import {
  login,
  register,
  requestPasswordReset,
  verifySession,
} from "../../src/services/authService";
import { AuthError } from "../../src/utils/errors";
import { issueToken } from "../../src/utils/token";

const DEMO_EMAIL = "demo@queuesmart.dev";
const ADMIN_EMAIL = "admin@queuesmart.dev";
const PASSWORD = "password123";

before(() => {
  seedMockAccounts();
});

describe("login", () => {
  it("returns a session for the demo account", async () => {
    const session = await login(
      { email: DEMO_EMAIL, password: PASSWORD },
      "127.0.0.1",
    );

    assert.equal(session.user.id, "u_demo");
    assert.equal(session.user.role, "user");
    assert.equal(session.boundIp, "127.0.0.1");
    assert.ok(session.token.length > 0);
    assert.ok(new Date(session.expiresAt).getTime() > Date.now());
  });

  it("normalizes the email before lookup", async () => {
    const session = await login(
      { email: "  ADMIN@QueueSmart.DEV ", password: PASSWORD },
      null,
    );

    assert.equal(session.user.role, "admin");
    assert.equal(session.user.email, ADMIN_EMAIL);
    assert.equal(session.boundIp, null);
  });

  it("rejects a wrong password", async () => {
    await assert.rejects(
      login({ email: DEMO_EMAIL, password: "wrong-password" }, null),
      (error: unknown) => {
        assert.ok(error instanceof AuthError);
        assert.equal(error.status, 401);
        assert.equal(error.message, "Incorrect email or password");
        return true;
      },
    );
  });

  it("rejects an unknown email with the same message", async () => {
    await assert.rejects(
      login({ email: "missing@example.com", password: PASSWORD }, null),
      /Incorrect email or password/,
    );
  });
});

describe("register", () => {
  it("creates a user and returns an authenticated session", async () => {
    const session = await register(
      {
        firstName: "E2E",
        lastName: "Tester",
        email: " Unit.Test@Example.com ",
        password: PASSWORD,
      },
      "10.0.0.1",
    );

    assert.match(session.user.id, /^u_[0-9a-f]{8}$/);
    assert.equal(session.user.firstName, "E2E");
    assert.equal(session.user.lastName, "Tester");
    assert.equal(session.user.email, "unit.test@example.com");
    assert.equal(session.user.role, "user");
    assert.equal(session.boundIp, "10.0.0.1");
    assert.equal(
      findUserByEmail("unit.test@example.com")?.id,
      session.user.id,
    );
  });

  it("rejects a duplicate email regardless of casing", async () => {
    await assert.rejects(
      register(
        {
          firstName: "Copy",
          lastName: "Cat",
          email: "  DEMO@queuesmart.dev ",
          password: PASSWORD,
        },
        null,
      ),
      (error: unknown) => {
        assert.ok(error instanceof AuthError);
        assert.equal(error.status, 409);
        assert.equal(
          error.message,
          "An account with this email already exists",
        );
        return true;
      },
    );
  });
});

describe("requestPasswordReset", () => {
  it("returns the cooldown for a first request", async () => {
    assert.deepEqual(await requestPasswordReset("reset.one@example.com"), {
      retryAfterSeconds: 60,
    });
  });

  it("rejects a second request within the cooldown", async () => {
    await requestPasswordReset("reset.two@example.com");

    await assert.rejects(
      requestPasswordReset("reset.two@example.com"),
      (error: unknown) => {
        assert.ok(error instanceof AuthError);
        assert.equal(error.status, 429);
        assert.match(
          error.message,
          /^Please wait \d+s before requesting another reset link$/,
        );
        return true;
      },
    );
  });

  it("tracks the cooldown per email", async () => {
    await requestPasswordReset("reset.three@example.com");
    assert.deepEqual(await requestPasswordReset("reset.four@example.com"), {
      retryAfterSeconds: 60,
    });
  });
});

describe("verifySession", () => {
  it("returns the user for a valid token", async () => {
    const session = await login(
      { email: DEMO_EMAIL, password: PASSWORD },
      "127.0.0.1",
    );

    const user = await verifySession(session.token, "127.0.0.1");
    assert.equal(user.id, "u_demo");
    assert.equal(user.email, DEMO_EMAIL);
  });

  it("skips the address check when the token has no bound address", async () => {
    const session = await login(
      { email: DEMO_EMAIL, password: PASSWORD },
      null,
    );

    const user = await verifySession(session.token, "10.1.2.3");
    assert.equal(user.id, "u_demo");
  });

  it("rejects a token used from another address", async () => {
    const session = await login(
      { email: DEMO_EMAIL, password: PASSWORD },
      "127.0.0.1",
    );

    await assert.rejects(
      verifySession(session.token, "10.9.9.9"),
      (error: unknown) => {
        assert.ok(error instanceof AuthError);
        assert.equal(error.status, 401);
        assert.match(error.message, /network address changed/);
        return true;
      },
    );
  });

  it("rejects a tampered token", async () => {
    await assert.rejects(
      verifySession("tampered.token.value", null),
      /Invalid or expired session/,
    );
  });

  it("rejects a token whose user no longer exists", async () => {
    const { token } = issueToken(
      "u_missing",
      "user",
      null,
      config.jwtSecret,
      60,
    );

    await assert.rejects(
      verifySession(token, null),
      /Invalid or expired session/,
    );
  });
});
