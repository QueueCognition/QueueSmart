import type { Response } from "express";
import type { User, UserRole } from "../types/auth";
import { AuthError } from "./errors";

export type SessionUser = Pick<User, "id" | "role">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "user" || value === "staff" || value === "admin";
}

export function currentUser(res: Response): SessionUser {
  const stored: unknown = res.locals.user;
  const candidate =
    isRecord(stored) && isRecord(stored.user) ? stored.user : stored;

  if (isRecord(candidate)) {
    const { id, role } = candidate;
    if (typeof id === "string" && isUserRole(role)) {
      return { id, role };
    }
  }

  throw new AuthError("Authentication required", 401);
}
