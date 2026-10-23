import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { QueueEntry } from "../types/queue";
import { getMyQueue } from "../services/queueService";

export function useQueueStatus() {
  const { isAuthenticated } = useAuth();
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    async function refresh() {
      try {
        const entries = await getMyQueue();
        if (active) {
          setEntry(entries[0] ?? null);
          setError("");
          setLoading(false);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Failed to load your queue status.",
          );
          setLoading(false);
        }
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  return {
    entry: isAuthenticated ? entry : null,
    error: isAuthenticated ? error : "",
    loading: isAuthenticated && loading,
  };
}
