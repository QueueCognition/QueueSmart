import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { seedMockAccounts } from "../../src/db/seed";
import {
  ADMIN_ACCOUNT,
  DEMO_ACCOUNT,
  findUserByEmail,
  findUserById,
  insertUser,
} from "../../src/models/userStore";

before(() => {
  seedMockAccounts();
});

describe("seedMockAccounts", () => {
  it("seeds the demo and admin accounts", () => {
    const demo = findUserByEmail(DEMO_ACCOUNT.email);
    const admin = findUserById("u_admin");

    assert.equal(demo?.id, "u_demo");
    assert.equal(demo?.role, "user");
    assert.equal(admin?.email, ADMIN_ACCOUNT.email);
    assert.equal(admin?.role, "admin");
  });

  it("does not duplicate accounts when run again", () => {
    seedMockAccounts();
    assert.equal(findUserByEmail(DEMO_ACCOUNT.email)?.id, "u_demo");
    assert.equal(findUserById("u_admin")?.email, ADMIN_ACCOUNT.email);
  });
});

describe("findUserByEmail", () => {
  it("normalizes case and surrounding spaces", () => {
    assert.equal(findUserByEmail("  DEMO@QueueSmart.DEV ")?.id, "u_demo");
  });

  it("returns undefined for unknown emails", () => {
    assert.equal(findUserByEmail("missing@example.com"), undefined);
  });
});

describe("insertUser", () => {
  it("stores a hashed password and normalizes the email", () => {
    const created = insertUser({
      id: "u_store_test",
      firstName: "Store",
      lastName: "Test",
      email: " Store.Test@Example.com ",
      password: "password123",
      role: "staff",
    });

    assert.equal(created.email, "store.test@example.com");
    assert.match(created.passwordHash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
    assert.equal(created.passwordHash.includes("password123"), false);
    assert.equal(findUserById("u_store_test")?.role, "staff");
  });
});
