import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Notification } from "../types/queue";
import { useAuth } from "./AuthContext";
import { getNotifications } from "../services/notificationService";

interface NotificationContextValue {
  notifications: Notification[];
  push: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<
  NotificationContextValue | undefined
>(undefined);

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isInitializing } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);


  useEffect(() => {
    if (!isAuthenticated || isInitializing) {
      setNotifications([]);
      return;
    }

    let active = true;

    async function refresh() {
      try {
        const loadedNotifications = await getNotifications();

        if (active) {
          setNotifications(loadedNotifications);
        }
      } catch (error: unknown) {
        if (active) {
          console.error("Failed to load notifications:", error);
        }
      }
    }

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, isInitializing]);


  const push = useCallback(
    (n: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...n,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true })),
    );
  }, []);

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

  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }

  return ctx;
}
