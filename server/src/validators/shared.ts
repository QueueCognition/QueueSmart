import type { FieldErrors } from "../utils/errors";

export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export const MAX_EMAIL_LENGTH = 254;
export const MAX_CUSTOMER_NAME_LENGTH = 100;
export const MAX_ID_LENGTH = 64;

export function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export interface TextOptions {
  trim?: boolean;
}

export function readText(
  source: Record<string, unknown>,
  key: string,
  options: TextOptions = {},
): string {
  const value = source[key];
  if (typeof value !== "string") return "";

  return options.trim === false ? value : value.trim();
}

export function hasFieldErrors(fieldErrors: FieldErrors): boolean {
  return Object.keys(fieldErrors).length > 0;
}
