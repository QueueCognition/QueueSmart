import type { Notification } from "../types/queue";
import { apiGet, apiPatch } from "./apiClient";

const NOTIFICATION_PATH = "notifications";

export function getNotifications(): Promise<Notification[]> {
  return apiGet<Notification[]>(NOTIFICATION_PATH);
}

export function markNotificationAsRead(
  notificationId: string,
): Promise<Notification> {
  return apiPatch<Notification>(
    `${NOTIFICATION_PATH}/${encodeURIComponent(notificationId)}/read`,
    { retry: 0 },
  );
}

export function markAllNotificationsAsRead(): Promise<void> {
  return apiPatch<void>(`${NOTIFICATION_PATH}/read`, { retry: 0 });
}
