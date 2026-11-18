import type {
  LoginInput,
  PasswordChangeInput,
  ProfileUpdateInput,
  RegisterInput,
} from "../types/auth";
import { ValidationError, type FieldErrors } from "../utils/errors";
import { EMAIL_PATTERN, asRecord, hasFieldErrors, readText } from "./shared";

const MAX_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 8;

function readOptionalText(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  return key in source ? readText(source, key) : undefined;
}

function ensureValid(fieldErrors: FieldErrors): void {
  if (hasFieldErrors(fieldErrors)) {
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

function validateNewPassword(
  password: string,
  fieldErrors: FieldErrors,
  field = "password",
): void {
  if (!password) {
    fieldErrors[field] = "Password is required";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors[field] = "Password must be at least 8 characters";
  }
}

export function validateLogin(body: unknown): LoginInput {
  const source = asRecord(body);
  const email = readText(source, "email");
  const password = readText(source, "password", { trim: false });
  const fieldErrors: FieldErrors = {};

  validateEmail(email, fieldErrors);
  if (!password) fieldErrors.password = "Password is required";

  ensureValid(fieldErrors);
  return { email, password };
}

export function validateRegister(body: unknown): RegisterInput {
  const source = asRecord(body);
  const firstName = readText(source, "firstName");
  const lastName = readText(source, "lastName");
  const email = readText(source, "email");
  const password = readText(source, "password", { trim: false });
  const fieldErrors: FieldErrors = {};

  validateName(firstName, "firstName", "First name", fieldErrors);
  validateName(lastName, "lastName", "Last name", fieldErrors);
  validateEmail(email, fieldErrors);
  validateNewPassword(password, fieldErrors);

  ensureValid(fieldErrors);
  return { firstName, lastName, email, password };
}

export function validatePasswordReset(body: unknown): { email: string } {
  const email = readText(asRecord(body), "email");
  const fieldErrors: FieldErrors = {};

  validateEmail(email, fieldErrors);
  ensureValid(fieldErrors);

  return { email };
}

export function validateProfileUpdate(body: unknown): ProfileUpdateInput {
  const source = asRecord(body);
  const firstName = readOptionalText(source, "firstName");
  const lastName = readOptionalText(source, "lastName");

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
  const currentPassword = readText(source, "currentPassword", { trim: false });
  const newPassword = readText(source, "newPassword", { trim: false });
  const fieldErrors: FieldErrors = {};

  if (!currentPassword) {
    fieldErrors.currentPassword = "Current password is required";
  }

  validateNewPassword(newPassword, fieldErrors, "newPassword");

  if (newPassword && currentPassword && newPassword === currentPassword) {
    fieldErrors.newPassword =
      "New password must be different from your current password";
  }

  ensureValid(fieldErrors);
  return { currentPassword, newPassword };
}
