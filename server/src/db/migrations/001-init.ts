import type { DatabaseSync } from "node:sqlite";
import { matchesDdl, tableExists } from "../migrate";

export const version = 1;
export const name = "init";

export const USERS = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
  first_name TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 50),
  last_name TEXT NOT NULL CHECK (length(last_name) BETWEEN 1 AND 50),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(email) <= 254),
  role TEXT NOT NULL CHECK (role IN ('user', 'staff', 'admin')),
  password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
  created_at TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0)
)`;

export const PASSWORD_RESET_REQUESTS = `
CREATE TABLE IF NOT EXISTS password_reset_requests (
  email TEXT PRIMARY KEY,
  requested_at INTEGER NOT NULL
)`;

export const SERVICES = `
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 2000),
  expected_duration INTEGER NOT NULL CHECK (expected_duration > 0),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1))
)`;

export const QUEUES = `
CREATE TABLE IF NOT EXISTS queues (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  UNIQUE (id, service_id)
)`;

export const QUEUE_ENTRIES = `
CREATE TABLE IF NOT EXISTS queue_entries (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  user_id TEXT NOT NULL CHECK (length(user_id) BETWEEN 1 AND 64),
  position INTEGER NOT NULL CHECK (
    (status IN ('waiting', 'almost_ready') AND position > 0)
    OR (status IN ('served', 'cancelled') AND position = 0)
  ),
  estimated_wait_minutes INTEGER NOT NULL CHECK (estimated_wait_minutes >= 0),
  status TEXT NOT NULL CHECK (status IN ('waiting', 'almost_ready', 'served', 'cancelled')),
  joined_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  customer_name TEXT NOT NULL CHECK (length(customer_name) BETWEEN 1 AND 100),
  customer_email TEXT NOT NULL CHECK (length(customer_email) BETWEEN 1 AND 254),
  date TEXT NOT NULL CHECK (length(date) = 10),
  time_slot TEXT NOT NULL CHECK (length(time_slot) BETWEEN 1 AND 20),
  ticket_number TEXT NOT NULL,
  FOREIGN KEY (queue_id, service_id)
    REFERENCES queues (id, service_id) ON DELETE CASCADE
)`;

export const QUEUE_TICKET_SEQUENCE = `
CREATE TABLE IF NOT EXISTS queue_ticket_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL CHECK (value >= 100)
)`;

export const NOTIFICATIONS = `
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('queue_update', 'status_change')),
  timestamp TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1))
)`;

export const APPOINTMENTS = `
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'completed', 'cancelled'))
)`;

export const TABLES: ReadonlyMap<string, string> = new Map([
  ["users", USERS],
  ["password_reset_requests", PASSWORD_RESET_REQUESTS],
  ["services", SERVICES],
  ["queues", QUEUES],
  ["queue_ticket_sequence", QUEUE_TICKET_SEQUENCE],
  ["notifications", NOTIFICATIONS],
  ["appointments", APPOINTMENTS],
  ["queue_entries", QUEUE_ENTRIES],
]);

const INDEXES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS queues_one_open_per_service_idx
    ON queues (service_id) WHERE status = 'open'`,
  `CREATE INDEX IF NOT EXISTS queue_entries_service_status_idx
    ON queue_entries (service_id, status, position)`,
  `CREATE INDEX IF NOT EXISTS notifications_user_timestamp_idx
    ON notifications (user_id, timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS appointments_user_date_idx
    ON appointments (user_id, date)`,
];

export function up(db: DatabaseSync): void {
  for (const [table, ddl] of TABLES) {
    if (tableExists(db, table) && !matchesDdl(db, table, ddl)) {
      throw new Error(
        `${table} already exists with a different definition; ` +
          "drop this database or add a migration that upgrades it",
      );
    }
  }

  for (const ddl of TABLES.values()) {
    db.exec(ddl);
  }

  for (const statement of INDEXES) {
    db.exec(statement);
  }

  db.exec(
    "INSERT OR IGNORE INTO queue_ticket_sequence (id, value) VALUES (1, 100)",
  );
}
