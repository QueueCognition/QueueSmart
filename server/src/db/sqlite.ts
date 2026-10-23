import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config/env";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'staff', 'admin')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  email TEXT PRIMARY KEY,
  requested_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_duration INTEGER NOT NULL CHECK (expected_duration > 0),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1))
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  estimated_wait_minutes INTEGER NOT NULL CHECK (estimated_wait_minutes >= 0),
  status TEXT NOT NULL CHECK (status IN ('waiting', 'almost_ready', 'served', 'cancelled')),
  joined_at TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  time_slot TEXT,
  ticket_number TEXT
);

CREATE INDEX IF NOT EXISTS queue_entries_service_status_idx
  ON queue_entries (service_id, status, position);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('queue_update', 'status_change')),
  timestamp TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1))
);

CREATE INDEX IF NOT EXISTS notifications_timestamp_idx
  ON notifications (timestamp DESC);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS appointments_user_date_idx
  ON appointments (user_id, date);
`;

function databaseFile(url: string): string {
  const path = url.startsWith("file:") ? url.slice("file:".length) : url;
  return path === ":memory:" ? path : resolve(path);
}

function openDatabase(): DatabaseSync {
  const file = databaseFile(config.databaseUrl);
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const database = new DatabaseSync(file);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(SCHEMA);
  return database;
}

export const db = openDatabase();
