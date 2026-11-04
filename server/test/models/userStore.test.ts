import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findUserByEmail,
  findUserById,
  insertUser,
} from "../../src/models/userStore";

describe("findUserByEmail", () => {
  it("normalizes case and surrounding spaces", () => {
    insertUser({
      id: "u_lookup",
      firstName: "Lookup",
      lastName: "User",
      email: "lookup@queuesmart.dev",
      password: "password123",
      role: "user",
    });

    assert.equal(findUserByEmail("  LOOKUP@QueueSmart.DEV ")?.id, "u_lookup");
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
