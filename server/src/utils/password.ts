import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const SALT_PATTERN = /^[0-9a-f]{32}$/;
const DERIVED_PATTERN = /^[0-9a-f]{128}$/;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;

  const [salt, derived] = parts;
  if (salt === undefined || derived === undefined) return false;
  if (!SALT_PATTERN.test(salt) || !DERIVED_PATTERN.test(derived)) return false;

  const expected = Buffer.from(derived, "hex");
  const actual = scryptSync(password, salt, KEY_LENGTH);

  return timingSafeEqual(expected, actual);
}
