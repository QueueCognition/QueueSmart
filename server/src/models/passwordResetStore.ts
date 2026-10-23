import { db } from "../db/sqlite";

export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function queryRequestedAt(email: string): number | null {
  const row = db
    .prepare("SELECT requested_at FROM password_reset_requests WHERE email = ?")
    .get(normalizeEmail(email));

  if (typeof row !== "object" || row === null) return null;

  const value = (row as Record<string, unknown>).requested_at;
  return typeof value === "number" ? value : null;
}

export function remainingCooldownSeconds(email: string, now = Date.now()): number {
  const requestedAt = queryRequestedAt(email);
  if (requestedAt === null) return 0;

  const elapsedSeconds = Math.floor((now - requestedAt) / 1000);
  return Math.max(0, PASSWORD_RESET_COOLDOWN_SECONDS - elapsedSeconds);
}

export function recordResetRequest(email: string, now = Date.now()): void {
  db.prepare(
    `INSERT INTO password_reset_requests (email, requested_at) VALUES (?, ?)
     ON CONFLICT(email) DO UPDATE SET requested_at = excluded.requested_at`,
  ).run(normalizeEmail(email), now);
}
