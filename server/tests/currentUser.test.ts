import type { Response } from "express";
import { describe, expect, it } from "vitest";
import { currentUser } from "../src/utils/currentUser";

function responseWith(user: unknown): Response {
  return { locals: { user } } as unknown as Response;
}

describe("currentUser", () => {
  it("returns the id and role of a logged-in user", () => {
    const user = currentUser(responseWith({ id: "u_demo", role: "user", email: "x@y.com" }));
    expect(user).toEqual({ id: "u_demo", role: "user" });
  });

  it("unwraps a session object that holds the user", () => {
    const user = currentUser(responseWith({ user: { id: "u_admin", role: "admin" }, token: "t" }));
    expect(user).toEqual({ id: "u_admin", role: "admin" });
  });

  it("throws 401 when nobody is logged in", () => {
    expect(() => currentUser(responseWith(undefined))).toThrowError(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("throws 401 for an unknown role", () => {
    expect(() => currentUser(responseWith({ id: "u1", role: "superuser" }))).toThrowError(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("throws 401 when the id is not a string", () => {
    expect(() => currentUser(responseWith({ id: 7, role: "user" }))).toThrowError(
      expect.objectContaining({ status: 401 }),
    );
  });
});