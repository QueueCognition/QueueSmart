import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findUserByEmail,
  findUserById,
  insertUser,
  updateUserName,
  updateUserPassword,
} from "../../src/models/userStore";
import { verifyPassword } from "../../src/utils/password";

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

describe("updateUserName", () => {
  insertUser({
    id: "u_update_test",
    firstName: "Before",
    lastName: "Name",
    email: "update.test@example.com",
    password: "password123",
    role: "user",
  });

  it("updates only the provided field", () => {
    const updated = updateUserName("u_update_test", { firstName: "After" });

    assert.equal(updated?.firstName, "After");
    assert.equal(updated?.lastName, "Name");
    assert.equal(updated?.email, "update.test@example.com");
    assert.equal(updated?.role, "user");
    assert.equal(updated?.createdAt, findUserById("u_update_test")?.createdAt);
  });

  it("updates both names at once", () => {
    const updated = updateUserName("u_update_test", {
      firstName: "Grace",
      lastName: "Hopper",
    });

    assert.equal(updated?.firstName, "Grace");
    assert.equal(updated?.lastName, "Hopper");
  });

  it("returns undefined for an unknown user", () => {
    assert.equal(updateUserName("u_missing", { firstName: "Nobody" }), undefined);
  });
});

describe("updateUserPassword", () => {
  it("replaces the hash without changing other fields", () => {
    insertUser({
      id: "u_password_test",
      firstName: "Password",
      lastName: "Tester",
      email: "password.test@example.com",
      password: "password123",
      role: "user",
    });

    updateUserPassword("u_password_test", "new-password-456");
    const stored = findUserById("u_password_test");

    assert.ok(stored);
    assert.equal(verifyPassword("new-password-456", stored.passwordHash), true);
    assert.equal(verifyPassword("password123", stored.passwordHash), false);
    assert.equal(stored.email, "password.test@example.com");
    assert.equal(stored.firstName, "Password");
  });
});
