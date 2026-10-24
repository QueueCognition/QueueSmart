import type { Notification } from "../types/queue";

export interface StoredNotification extends Notification {
  userId: string;
}

const notifications: StoredNotification[] = [];

export function listNotificationsForUser(
  userId: string
): StoredNotification[] {
  return notifications.filter(
    (notification) => notification.userId === userId
  );
}

export function insertNotification(
  notification: StoredNotification
): void {
  notifications.push(notification);
}

export function markNotificationRead(
  userId: string,
  notificationId: string
): StoredNotification | undefined {
  const notification = notifications.find(
    (item) => item.id === notificationId && item.userId === userId
  );

  if (!notification) {
    return undefined;
  }

  notification.read = true;
  return notification;
}

export function markAllNotificationsRead(
  userId: string
): void {
  for (const notification of notifications) {
    if (notification.userId === userId) {
      notification.read = true;
    }
  }
}

export function clearNotificationStore(): void {
  notifications.length = 0;
}
