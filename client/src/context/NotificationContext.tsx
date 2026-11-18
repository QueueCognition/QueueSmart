import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "../types/queue";
import { useAuth } from "./AuthContext";
import { POLL_INTERVAL_MS, queryKeys } from "../lib/queryClient";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

interface NotificationContextValue {
  notifications: Notification[];
  push: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const client = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotifications,
    enabled: isAuthenticated && !isInitializing,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const notifications = useMemo(
    () => (isAuthenticated ? (query.data ?? []) : []),
    [isAuthenticated, query.data],
  );

  const markOne = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (updated) => {
      client.setQueryData<Notification[]>(queryKeys.notifications, (current) =>
        current?.map((n) => (n.id === updated.id ? updated : n)),
      );
    },
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      client.setQueryData<Notification[]>(queryKeys.notifications, (current) =>
        current?.map((n) => ({ ...n, read: true })),
      );
    },
  });

  const push = useCallback(
    (n: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...n,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        read: false,
      };

      client.setQueryData<Notification[]>(queryKeys.notifications, (current) =>
        current ? [newNotification, ...current] : [newNotification],
      );
    },
    [client],
  );

  const markRead = useCallback(
    (id: string) => {
      markOne.mutate(id);
    },
    [markOne],
  );

  const markAllRead = useCallback(() => {
    markAll.mutate();
  }, [markAll]);

  const value = useMemo(
    () => ({ notifications, push, markRead, markAllRead }),
    [notifications, push, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);

  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }

  return ctx;
}
