import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Response } from "express";
import { currentUser } from "../../src/utils/currentUser";

function responseWith(user: unknown): Response {
  return { locals: { user } } as unknown as Response;
}

function assertUnauthorized(fn: () => unknown): void {
  assert.throws(fn, (error: unknown) => {
    assert.equal((error as { status?: number }).status, 401);
    return true;
  });
}

describe("currentUser", () => {
  it("returns the id and role of a logged-in user", () => {
    const user = currentUser(responseWith({ id: "u_demo", role: "user", email: "x@y.com" }));
    assert.deepEqual(user, { id: "u_demo", role: "user" });
  });

  it("unwraps a session object that holds the user", () => {
    const user = currentUser(responseWith({ user: { id: "u_admin", role: "admin" }, token: "t" }));
    assert.deepEqual(user, { id: "u_admin", role: "admin" });
  });

  it("throws 401 when nobody is logged in", () => {
    assertUnauthorized(() => currentUser(responseWith(undefined)));
  });

  it("throws 401 for an unknown role", () => {
    assertUnauthorized(() => currentUser(responseWith({ id: "u1", role: "superuser" })));
  });

  it("throws 401 when the id is not a string", () => {
    assertUnauthorized(() => currentUser(responseWith({ id: 7, role: "user" })));
  });
});
