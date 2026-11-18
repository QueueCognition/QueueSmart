import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { POLL_INTERVAL_MS, queryKeys } from "../lib/queryClient";
import { describeApiError } from "../services/apiClient";
import { AuthError } from "../services/authError";
import {
  getAdminServiceWaitSummaries,
  serveNext as serveNextEntry,
} from "../services/queueService";
import type { QueueEntry, QueueServiceSummary } from "../types/queue";

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

function isSessionExpired(cause: unknown): boolean {
  return cause instanceof AuthError && cause.status === 401;
}

export function useAdminQueues(): UseAdminQueuesResult {
  const { logout } = useAuth();
  const client = useQueryClient();
  const [servingServiceId, setServingServiceId] = useState<string | null>(null);
  const [serveError, setServeError] = useState("");

  const query = useQuery({
    queryKey: queryKeys.adminQueues,
    queryFn: getAdminServiceWaitSummaries,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const serveMutation = useMutation({
    mutationFn: serveNextEntry,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.adminQueues });
    },
  });

  const queryFailed = query.isError;

  useEffect(() => {
    if (queryFailed && isSessionExpired(query.error)) {
      logout(SESSION_EXPIRED_NOTICE);
    }
  }, [queryFailed, query.error, logout]);

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const serveNext = useCallback(
    async (serviceId: string): Promise<ServeNextOutcome | null> => {
      if (servingServiceId !== null) return null;

      setServingServiceId(serviceId);
      setServeError("");
      try {
        return await serveMutation.mutateAsync(serviceId);
      } catch (cause) {
        if (isSessionExpired(cause)) {
          logout(SESSION_EXPIRED_NOTICE);
        } else {
          setServeError(
            describeApiError(cause, "Failed to update queue entry status."),
          );
        }
        return null;
      } finally {
        setServingServiceId(null);
      }
    },
    [logout, serveMutation, servingServiceId],
  );

  const error = queryFailed
    ? isSessionExpired(query.error)
      ? ""
      : describeApiError(query.error, "Failed to load queue summaries.")
    : serveError;

  return {
    summaries: query.data ?? [],
    loading: query.isPending,
    error,
    lastRefreshed: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    servingServiceId,
    refresh,
    serveNext,
  };
}
