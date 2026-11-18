import { ValidationError, type FieldErrors } from "../utils/errors";
import {
  EMAIL_PATTERN,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ID_LENGTH,
  asRecord,
  hasFieldErrors,
} from "./shared";

export const QUEUE_TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
];

export interface JoinQueueInput {
  serviceId: string;
  customerName: string;
  customerEmail: string;
  date: string;
  timeSlot: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function earliestAllowedDate(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function readRequiredText(
  source: Record<string, unknown>,
  key: string,
  errors: FieldErrors,
  requiredMessage: string,
): string {
  const value = source[key];

  if (value === undefined || value === null) {
    errors[key] = requiredMessage;
    return "";
  }
  if (typeof value !== "string") {
    errors[key] = "Must be text";
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) errors[key] = requiredMessage;
  return trimmed;
}

export function validateJoinQueueInput(body: unknown): JoinQueueInput {
  const source = asRecord(body);
  const errors: FieldErrors = {};

  const serviceId = readRequiredText(
    source,
    "serviceId",
    errors,
    "Please select a service",
  );
  const fullName = readRequiredText(
    source,
    "fullName",
    errors,
    "Full name is required",
  );
  const email = readRequiredText(source, "email", errors, "Email is required");
  const date = readRequiredText(source, "date", errors, "Please select a date");
  const timeSlot = readRequiredText(
    source,
    "timeSlot",
    errors,
    "Please select a time slot",
  );

  if (serviceId.length > MAX_ID_LENGTH) {
    errors.serviceId = "Invalid service";
  }

  if (fullName.length > MAX_CUSTOMER_NAME_LENGTH) {
    errors.fullName = `Name must be ${MAX_CUSTOMER_NAME_LENGTH} characters or fewer`;
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    errors.email = `Email must be ${MAX_EMAIL_LENGTH} characters or fewer`;
  } else if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (date) {
    if (!isRealDate(date))
      errors.date = "Date must be a real date in YYYY-MM-DD format";
    else if (date < earliestAllowedDate())
      errors.date = "Date cannot be in the past";
  }

  if (timeSlot && !QUEUE_TIME_SLOTS.includes(timeSlot)) {
    errors.timeSlot = "Invalid time slot";
  }

  if (hasFieldErrors(errors)) {
    throw new ValidationError(errors);
  }

  return {
    serviceId,
    customerName: fullName,
    customerEmail: email,
    date,
    timeSlot,
  };
}
