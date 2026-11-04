import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findUserByEmail, hasUsers } from "../../src/models/userStore";
import { register } from "../../src/services/authService";

const PASSWORD = "password123";

describe("registration role", () => {
  it("starts with an empty user table", () => {
    assert.equal(hasUsers(), false);
  });

  it("grants the first account the admin role", async () => {
    const session = await register(
      {
        firstName: "First",
        lastName: "Owner",
        email: " First.Owner@Example.com ",
        password: PASSWORD,
      },
      null,
    );

    assert.equal(session.user.role, "admin");
    assert.equal(findUserByEmail("first.owner@example.com")?.role, "admin");
  });

  it("keeps every later account a regular user", async () => {
    const session = await register(
      {
        firstName: "Second",
        lastName: "Visitor",
        email: "second.visitor@example.com",
        password: PASSWORD,
      },
      null,
    );

    assert.equal(session.user.role, "user");
  });
});
