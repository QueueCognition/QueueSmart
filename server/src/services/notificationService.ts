
import { randomUUID } from "node:crypto";
import {
  insertNotification,
  listNotificationsForUser,
  type StoredNotification,
} from "../models/notificationStore";
import type { Notification, NotificationType } from "../types/queue";

export function createNotification(
  userId: string,
  message: string,
  type: NotificationType = "queue_update"
): Notification {
  const notification: StoredNotification = {
    id: randomUUID(),
    userId,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  };

  insertNotification(notification);

  return {
    id: notification.id,
    message: notification.message,
    type: notification.type,
    timestamp: notification.timestamp,
    read: notification.read,
  };
}

export function getNotificationsForUser(
  userId: string
): Notification[] {
  return listNotificationsForUser(userId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    )
    .map(({ id, message, type, timestamp, read }) => ({
      id,
      message,
      type,
      timestamp,
      read,
    }));
}
