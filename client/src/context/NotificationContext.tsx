import { createContext, useContext, useState, type ReactNode } from "react";
import type { Notification } from "../types/queue";

interface NotificationContextValue {
  notifications: Notification[];
  push: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60 * 1000).toISOString();

const demoNotifications: Notification[] = [
  {
    id: crypto.randomUUID(),
    type: "queue_update",
    message: "You're now #2 in line",
    timestamp: minutesAgo(2),
    read: false,
  },
  {
    id: crypto.randomUUID(),
    type: "status_change",
    message: "Your status is now almost ready",
    timestamp: minutesAgo(15),
    read: false,
  },
  {
    id: crypto.randomUUID(),
    type: "queue_update",
    message: "Estimated wait updated to 12 minutes",
    timestamp: minutesAgo(60),
    read: true,
  },
  {
    id: crypto.randomUUID(),
    type: "status_change",
    message: "You joined the queue",
    timestamp: minutesAgo(60 * 3),
    read: true,
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] =
    useState<Notification[]>(demoNotifications);

  function push(n: Omit<Notification, "id" | "timestamp" | "read">) {
    const newNotification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <NotificationContext.Provider
      value={{ notifications, push, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return ctx;
}