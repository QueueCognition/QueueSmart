import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config/env";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
  first_name TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 50),
  last_name TEXT NOT NULL CHECK (length(last_name) BETWEEN 1 AND 50),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(email) <= 254),
  role TEXT NOT NULL CHECK (role IN ('user', 'staff', 'admin')),
  password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
  created_at TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0)
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  email TEXT PRIMARY KEY,
  requested_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 2000),
  expected_duration INTEGER NOT NULL CHECK (expected_duration > 0),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1))
);

CREATE TABLE IF NOT EXISTS queues (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  UNIQUE (id, service_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS queues_one_open_per_service_idx
  ON queues (service_id) WHERE status = 'open';

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
);

CREATE INDEX IF NOT EXISTS queue_entries_service_status_idx
  ON queue_entries (service_id, status, position);

CREATE TABLE IF NOT EXISTS queue_ticket_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL CHECK (value >= 100)
);

INSERT OR IGNORE INTO queue_ticket_sequence (id, value) VALUES (1, 100);

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
  migrateUserTokenVersion(database);
  migrateQueueEntries(database);
  return database;
}

function migrateUserTokenVersion(database: DatabaseSync): void {
  if (tableColumns(database, "users").has("token_version")) return;

  database.exec(
    "ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0",
  );
}

function tableColumns(database: DatabaseSync, table: string): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(
    rows.map((row) => String((row as Record<string, unknown>).name)),
  );
}

function migrateQueueEntries(database: DatabaseSync): void {
  const columns = tableColumns(database, "queue_entries");
  if (columns.has("queue_id") && columns.has("user_id")) return;

  const legacyRows = database
    .prepare(
      `SELECT id, service_id, position, estimated_wait_minutes, status,
              joined_at, customer_name, customer_email, time_slot, ticket_number
       FROM queue_entries`,
    )
    .all() as Record<string, unknown>[];
  const queueIds = new Map<string, { id: string; hasActiveEntries: boolean }>();

  for (const row of legacyRows) {
    const serviceId = String(row.service_id);
    const current = queueIds.get(serviceId);
    const active = row.status === "waiting" || row.status === "almost_ready";
    if (current) {
      current.hasActiveEntries ||= active;
    } else {
      queueIds.set(serviceId, { id: randomUUID(), hasActiveEntries: active });
    }
  }

  database.exec("BEGIN");
  try {
    const insertQueue = database.prepare(
      "INSERT INTO queues (id, service_id, status, created_at) VALUES (?, ?, ?, ?)",
    );
    for (const [serviceId, queue] of queueIds) {
      const firstEntry = legacyRows.find(
        (row) => String(row.service_id) === serviceId,
      );
      insertQueue.run(
        queue.id,
        serviceId,
        queue.hasActiveEntries ? "open" : "closed",
        String(firstEntry?.joined_at ?? new Date().toISOString()),
      );
    }

    database.exec(`
      CREATE TABLE queue_entries_new (
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
      )
    `);

    const findUser = database.prepare(
      "SELECT id FROM users WHERE email = ? COLLATE NOCASE",
    );
    const findPriority = database.prepare(
      "SELECT priority FROM services WHERE id = ?",
    );
    const insertEntry = database.prepare(
      `INSERT INTO queue_entries_new
       (id, queue_id, service_id, user_id, position, estimated_wait_minutes,
        status, joined_at, updated_at, priority, customer_name, customer_email,
        date, time_slot, ticket_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const row of legacyRows) {
      const id = String(row.id);
      const serviceId = String(row.service_id);
      const joinedAt = String(row.joined_at);
      const queueId = queueIds.get(serviceId)?.id;
      if (!queueId) {
        throw new Error(`Could not create a queue for legacy entry ${id}`);
      }
      const email =
        typeof row.customer_email === "string" && row.customer_email
          ? row.customer_email.slice(0, 254)
          : `legacy-${id}@queuesmart.invalid`;
      const matchingUser = findUser.get(email) as
        | { id: string }
        | undefined;
      const service = findPriority.get(serviceId) as
        | { priority: string }
        | undefined;

      insertEntry.run(
        id,
        queueId,
        serviceId,
        matchingUser?.id ?? `legacy-${id}`.slice(0, 64),
        row.status === "waiting" || row.status === "almost_ready"
          ? Number(row.position)
          : 0,
        Number(row.estimated_wait_minutes),
        String(row.status),
        joinedAt,
        joinedAt,
        service?.priority ?? "medium",
        (typeof row.customer_name === "string" && row.customer_name
          ? row.customer_name
          : "Legacy customer"
        ).slice(0, 100),
        email,
        joinedAt.slice(0, 10),
        (typeof row.time_slot === "string" && row.time_slot
          ? row.time_slot
          : "Unspecified"
        ).slice(0, 20),
        typeof row.ticket_number === "string" && row.ticket_number
          ? row.ticket_number
          : `LEGACY-${id}`,
      );
    }

    database.exec(`
      DROP TABLE queue_entries;
      ALTER TABLE queue_entries_new RENAME TO queue_entries;
      CREATE INDEX queue_entries_service_status_idx
        ON queue_entries (service_id, status, position);
    `);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export const db = openDatabase();
