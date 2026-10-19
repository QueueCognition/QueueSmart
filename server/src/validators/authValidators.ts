import type { LoginInput, RegisterInput } from "../types/auth";
import { ValidationError, type FieldErrors } from "../utils/errors";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MAX_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 8;

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

function readTrimmed(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readPassword(source: Record<string, unknown>): string {
  const value = source.password;
  return typeof value === "string" ? value : "";
}

function ensureValid(fieldErrors: FieldErrors): void {
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError(fieldErrors);
  }
}

function validateEmail(email: string, fieldErrors: FieldErrors): void {
  if (!email) {
    fieldErrors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address";
  }
}

export function validateLogin(body: unknown): LoginInput {
  const source = asRecord(body);
  const email = readTrimmed(source, "email");
  const password = readPassword(source);
  const fieldErrors: FieldErrors = {};

  validateEmail(email, fieldErrors);
  if (!password) fieldErrors.password = "Password is required";

  ensureValid(fieldErrors);
  return { email, password };
}

export function validateRegister(body: unknown): RegisterInput {
  const source = asRecord(body);
  const firstName = readTrimmed(source, "firstName");
  const lastName = readTrimmed(source, "lastName");
  const email = readTrimmed(source, "email");
  const password = readPassword(source);
  const fieldErrors: FieldErrors = {};

  if (!firstName) fieldErrors.firstName = "First name is required";
  else if (firstName.length > MAX_NAME_LENGTH) {
    fieldErrors.firstName = "Must be under 50 characters";
  }

  if (!lastName) fieldErrors.lastName = "Last name is required";
  else if (lastName.length > MAX_NAME_LENGTH) {
    fieldErrors.lastName = "Must be under 50 characters";
  }

  validateEmail(email, fieldErrors);

  if (!password) fieldErrors.password = "Password is required";
  else if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = "Password must be at least 8 characters";
  }

  ensureValid(fieldErrors);
  return { firstName, lastName, email, password };
}

export function validatePasswordReset(body: unknown): { email: string } {
  const email = readTrimmed(asRecord(body), "email");
  const fieldErrors: FieldErrors = {};

  validateEmail(email, fieldErrors);
  ensureValid(fieldErrors);

  return { email };
}
