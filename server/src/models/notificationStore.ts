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

export function clearNotificationStore(): void {
  notifications.length = 0;
}
