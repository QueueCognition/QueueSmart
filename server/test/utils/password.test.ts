import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "../../src/utils/password";

describe("hashPassword", () => {
  it("produces a salted scrypt hash", () => {
    assert.match(hashPassword("password123"), /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("uses a fresh salt for every hash", () => {
    assert.notEqual(hashPassword("password123"), hashPassword("password123"));
  });
});

describe("verifyPassword", () => {
  it("accepts the original password", () => {
    assert.equal(
      verifyPassword("password123", hashPassword("password123")),
      true,
    );
  });

  it("rejects a different password", () => {
    assert.equal(
      verifyPassword("password124", hashPassword("password123")),
      false,
    );
  });

  it("rejects malformed stored values", () => {
    assert.equal(verifyPassword("password123", ""), false);
    assert.equal(verifyPassword("password123", "salthash"), false);
    assert.equal(verifyPassword("password123", "salt:"), false);
  });
});
