import type { Notification } from "../types/queue";
import { db } from "../db/sqlite";

export interface StoredNotification extends Notification {
  userId: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  message: string;
  type: Notification["type"];
  timestamp: string;
  is_read: number;
}

export function listNotificationsForUser(userId: string): StoredNotification[] {
  const rows = db
    .prepare(
      `
  SELECT id, user_id, message, type, timestamp, is_read
  FROM notifications
  WHERE user_id = ?
  ORDER BY timestamp DESC
`,
    )
    .all(userId) as unknown as NotificationRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    message: row.message,
    type: row.type,
    timestamp: row.timestamp,
    read: Boolean(row.is_read),
  }));
}

export function insertNotification(notification: StoredNotification): void {
  db.prepare(
    `
    INSERT INTO notifications (
      id, user_id, message, type, timestamp, is_read
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    notification.id,
    notification.userId,
    notification.message,
    notification.type,
    notification.timestamp,
    Number(notification.read),
  );
}

export function markNotificationRead(
  userId: string,
  notificationId: string,
): StoredNotification | undefined {
  const result = db
    .prepare(
      `
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `,
    )
    .run(notificationId, userId);

  if (result.changes === 0) {
    return undefined;
  }

  const row = db
    .prepare(
      `
    SELECT id, user_id, message, type, timestamp, is_read
    FROM notifications
    WHERE id = ? AND user_id = ?
  `,
    )
    .get(notificationId, userId) as unknown as NotificationRow | undefined;

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    type: row.type,
    timestamp: row.timestamp,
    read: Boolean(row.is_read),
  };
}

export function markAllNotificationsRead(userId: string): void {
  db.prepare(
    `
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ?
  `,
  ).run(userId);
}

export function clearNotificationStore(): void {
  db.prepare("DELETE FROM notifications").run();
}
