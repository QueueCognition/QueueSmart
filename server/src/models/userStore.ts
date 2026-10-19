import { db } from "../db/sqlite";
import type { User, UserRole } from "../types/auth";
import { hashPassword } from "../utils/password";

export interface StoredUser extends User {
  passwordHash: string;
  createdAt: string;
}

export interface NewUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

export const DEMO_ACCOUNT = {
  email: "demo@queuesmart.dev",
  password: "password123",
} as const;

export const ADMIN_ACCOUNT = {
  email: "admin@queuesmart.dev",
  password: "password123",
} as const;

const ROLES: readonly UserRole[] = ["user", "staff", "admin"];

const SELECT_COLUMNS =
  "id, first_name, last_name, email, role, password_hash, created_at";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRole(value: unknown): UserRole {
  return ROLES.includes(value as UserRole) ? (value as UserRole) : "user";
}

function mapRow(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email),
    role: normalizeRole(row.role),
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at),
  };
}

function queryUser(sql: string, value: string): StoredUser | undefined {
  const row = db.prepare(sql).get(value);
  if (typeof row !== "object" || row === null) return undefined;

  return mapRow(row as Record<string, unknown>);
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return queryUser(
    `SELECT ${SELECT_COLUMNS} FROM users WHERE email = ?`,
    normalizeEmail(email),
  );
}

export function findUserById(id: string): StoredUser | undefined {
  return queryUser(`SELECT ${SELECT_COLUMNS} FROM users WHERE id = ?`, id);
}

export function insertUser(input: NewUser): StoredUser {
  const record: StoredUser = {
    id: input.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: normalizeEmail(input.email),
    role: input.role,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO users (${SELECT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    record.id,
    record.firstName,
    record.lastName,
    record.email,
    record.role,
    record.passwordHash,
    record.createdAt,
  );

  return record;
}

export function toPublicUser(user: StoredUser): User {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}
