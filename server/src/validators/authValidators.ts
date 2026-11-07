import type {
  LoginInput,
  PasswordChangeInput,
  ProfileUpdateInput,
  RegisterInput,
} from "../types/auth";
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

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function readOptionalString(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  if (!(key in source)) return undefined;

  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
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

function validateName(
  value: string,
  field: "firstName" | "lastName",
  label: string,
  fieldErrors: FieldErrors,
): void {
  if (!value) {
    fieldErrors[field] = `${label} is required`;
  } else if (value.length > MAX_NAME_LENGTH) {
    fieldErrors[field] = "Must be under 50 characters";
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

  validateName(firstName, "firstName", "First name", fieldErrors);
  validateName(lastName, "lastName", "Last name", fieldErrors);
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

export function validateProfileUpdate(body: unknown): ProfileUpdateInput {
  const source = asRecord(body);
  const firstName = readOptionalString(source, "firstName");
  const lastName = readOptionalString(source, "lastName");

  if (firstName === undefined && lastName === undefined) {
    throw new ValidationError({}, "No profile changes were provided");
  }

  const fieldErrors: FieldErrors = {};
  if (firstName !== undefined) {
    validateName(firstName, "firstName", "First name", fieldErrors);
  }
  if (lastName !== undefined) {
    validateName(lastName, "lastName", "Last name", fieldErrors);
  }

  ensureValid(fieldErrors);

  const input: ProfileUpdateInput = {};
  if (firstName !== undefined) input.firstName = firstName;
  if (lastName !== undefined) input.lastName = lastName;
  return input;
}

export function validatePasswordChange(body: unknown): PasswordChangeInput {
  const source = asRecord(body);
  const currentPassword = readString(source, "currentPassword");
  const newPassword = readString(source, "newPassword");
  const fieldErrors: FieldErrors = {};

  if (!currentPassword) {
    fieldErrors.currentPassword = "Current password is required";
  }

  if (!newPassword) {
    fieldErrors.newPassword = "Password is required";
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.newPassword = "Password must be at least 8 characters";
  } else if (currentPassword && newPassword === currentPassword) {
    fieldErrors.newPassword =
      "New password must be different from your current password";
  }

  ensureValid(fieldErrors);
  return { currentPassword, newPassword };
}
