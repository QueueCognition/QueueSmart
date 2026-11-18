import { randomUUID } from "node:crypto";
import { db } from "../db/sqlite";
import type { QueueEntryRecord } from "../types/queue";

type QueueEntryRow = Record<string, unknown> & {
  id: string;
  service_id: string;
  user_id: string;
  position: number;
  estimated_wait_minutes: number;
  status: QueueEntryRecord["status"];
  joined_at: string;
  updated_at: string;
  priority: QueueEntryRecord["priority"];
  customer_name: string;
  customer_email: string;
  date: string;
  time_slot: string;
  ticket_number: string;
};

const PRIORITY_RANK_SQL = `
  CASE priority
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 1
    ELSE 0
  END`;

function mapEntry(row: QueueEntryRow): QueueEntryRecord {
  return {
    id: row.id,
    serviceId: row.service_id,
    userId: row.user_id,
    position: row.position,
    estimatedWaitMinutes: row.estimated_wait_minutes,
    status: row.status,
    joinedAt: row.joined_at,
    updatedAt: row.updated_at,
    priority: row.priority,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    date: row.date,
    timeSlot: row.time_slot,
    ticketNumber: row.ticket_number,
  };
}

const SELECT_ENTRIES = `
  SELECT id, service_id, user_id, position, estimated_wait_minutes, status,
         joined_at, updated_at, priority, customer_name, customer_email,
         date, time_slot, ticket_number
  FROM queue_entries
`;

const ACTIVE_STATUSES = "('waiting', 'almost_ready')";

export function listEntries(): QueueEntryRecord[] {
  return (db.prepare(SELECT_ENTRIES).all() as QueueEntryRow[]).map(mapEntry);
}

export function listActiveEntries(serviceId: string): QueueEntryRecord[] {
  const rows = db
    .prepare(
      `${SELECT_ENTRIES}
       WHERE service_id = ? AND status IN ${ACTIVE_STATUSES}
       ORDER BY ${PRIORITY_RANK_SQL} DESC, joined_at ASC, rowid ASC`,
    )
    .all(serviceId) as QueueEntryRow[];

  return rows.map(mapEntry);
}

export function findEntryById(entryId: string): QueueEntryRecord | undefined {
  const row = db.prepare(`${SELECT_ENTRIES} WHERE id = ?`).get(entryId) as
    QueueEntryRow | undefined;

  return row ? mapEntry(row) : undefined;
}

export function listActiveEntriesForUser(userId: string): QueueEntryRecord[] {
  const rows = db
    .prepare(
      `${SELECT_ENTRIES}
       WHERE user_id = ? AND status IN ${ACTIVE_STATUSES}
       ORDER BY joined_at ASC, rowid ASC`,
    )
    .all(userId) as QueueEntryRow[];

  return rows.map(mapEntry);
}

export function listClosedEntriesForUser(userId: string): QueueEntryRecord[] {
  const rows = db
    .prepare(
      `${SELECT_ENTRIES}
       WHERE user_id = ? AND status NOT IN ${ACTIVE_STATUSES}
       ORDER BY updated_at DESC, rowid DESC`,
    )
    .all(userId) as QueueEntryRow[];

  return rows.map(mapEntry);
}

export function insertEntry(entry: QueueEntryRecord): void {
  const queue = db
    .prepare("SELECT id FROM queues WHERE service_id = ? AND status = 'open'")
    .get(entry.serviceId) as { id: string } | undefined;
  const queueId = queue?.id ?? randomUUID();

  if (!queue) {
    db.prepare(
      "INSERT INTO queues (id, service_id, status, created_at) VALUES (?, ?, 'open', ?)",
    ).run(queueId, entry.serviceId, entry.joinedAt);
  }

  db.prepare(
    `INSERT INTO queue_entries
     (id, queue_id, service_id, user_id, position, estimated_wait_minutes,
      status, joined_at, updated_at, priority, customer_name, customer_email,
      date, time_slot, ticket_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.id,
    queueId,
    entry.serviceId,
    entry.userId,
    entry.position,
    entry.estimatedWaitMinutes,
    entry.status,
    entry.joinedAt,
    entry.updatedAt,
    entry.priority,
    entry.customerName,
    entry.customerEmail,
    entry.date,
    entry.timeSlot,
    entry.ticketNumber,
  );
}

export function updateEntry(entry: QueueEntryRecord): void {
  db.prepare(
    `UPDATE queue_entries
     SET position = ?, estimated_wait_minutes = ?, status = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    entry.position,
    entry.estimatedWaitMinutes,
    entry.status,
    entry.updatedAt,
    entry.id,
  );
}

export function reprioritize(
  serviceId: string,
  expectedDuration: number,
): void {
  db.prepare(
    `UPDATE queue_entries
     SET position = ranked.position,
         estimated_wait_minutes = ranked.position * ?,
         status = CASE WHEN ranked.position = 1 THEN 'almost_ready' ELSE 'waiting' END
     FROM (
       SELECT id AS entry_id,
              ROW_NUMBER() OVER (
                ORDER BY ${PRIORITY_RANK_SQL} DESC, joined_at ASC, rowid ASC
              ) AS position
       FROM queue_entries
       WHERE service_id = ? AND status IN ('waiting', 'almost_ready')
     ) AS ranked
     WHERE queue_entries.id = ranked.entry_id`,
  ).run(expectedDuration, serviceId);
}

export function closeQueueIfEmpty(serviceId: string): void {
  db.prepare(
    `UPDATE queues
     SET status = 'closed'
     WHERE service_id = ? AND status = 'open'
       AND NOT EXISTS (
         SELECT 1 FROM queue_entries
         WHERE queue_entries.queue_id = queues.id
           AND queue_entries.status IN ('waiting', 'almost_ready')
       )`,
  ).run(serviceId);
}

export function nextTicketSequence(): number {
  const row = db
    .prepare(
      `UPDATE queue_ticket_sequence
       SET value = value + 1
       WHERE id = 1
       RETURNING value`,
    )
    .get() as { value: number } | undefined;

  if (!row) {
    throw new Error("Queue ticket sequence is not initialized");
  }
  return row.value;
}

export function clearQueueStore(): void {
  db.exec("DELETE FROM queue_entries; DELETE FROM queues;");
  db.prepare("UPDATE queue_ticket_sequence SET value = 100 WHERE id = 1").run();
}
