import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { describeApiError } from "../services/apiClient";
import { AuthError } from "../services/authError";
import {
  getAdminServiceWaitSummaries,
  serveNext as serveNextEntry,
} from "../services/queueService";
import type { QueueEntry, QueueServiceSummary } from "../types/queue";

const REFRESH_INTERVAL_MS = 5000;
const SESSION_EXPIRED_NOTICE = "Your session expired. Please sign in again.";

export interface ServeNextOutcome {
  served: QueueEntry;
  nextUp: QueueEntry | null;
}

export interface UseAdminQueuesResult {
  summaries: QueueServiceSummary[];
  loading: boolean;
  error: string;
  lastRefreshed: Date | null;
  servingServiceId: string | null;
  refresh: () => void;
  serveNext: (serviceId: string) => Promise<ServeNextOutcome | null>;
}

export function useAdminQueues(): UseAdminQueuesResult {
  const { logout } = useAuth();
  const [summaries, setSummaries] = useState<QueueServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [servingServiceId, setServingServiceId] = useState<string | null>(null);

  const mounted = useRef(true);
  const sessionExpired = useRef(false);
  const servingRef = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleFailure = useCallback(
    (cause: unknown, fallback: string) => {
      if (cause instanceof AuthError && cause.status === 401) {
        if (sessionExpired.current) return;
        sessionExpired.current = true;
        logout(SESSION_EXPIRED_NOTICE);
        return;
      }

      if (!mounted.current) return;
      setError(describeApiError(cause, fallback));
    },
    [logout],
  );

  const sync = useCallback(() => {
    getAdminServiceWaitSummaries()
      .then((data) => {
        if (!mounted.current) return;
        setSummaries(data);
        setLastRefreshed(new Date());
        setError("");
      })
      .catch((cause: unknown) => {
        handleFailure(cause, "Failed to load queue summaries.");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, [handleFailure]);

  useEffect(() => {
    sync();
    const interval = window.setInterval(sync, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [sync]);

  const refresh = useCallback(() => {
    sync();
  }, [sync]);

  const serveNext = useCallback(
    async (serviceId: string): Promise<ServeNextOutcome | null> => {
      if (servingRef.current !== null) return null;

      servingRef.current = serviceId;
      setServingServiceId(serviceId);
      try {
        const outcome = await serveNextEntry(serviceId);
        sync();
        return outcome;
      } catch (cause) {
        handleFailure(cause, "Failed to update queue entry status.");
        return null;
      } finally {
        servingRef.current = null;
        if (mounted.current) setServingServiceId(null);
      }
    },
    [handleFailure, sync],
  );

  return {
    summaries,
    loading,
    error,
    lastRefreshed,
    servingServiceId,
    refresh,
    serveNext,
  };
}
