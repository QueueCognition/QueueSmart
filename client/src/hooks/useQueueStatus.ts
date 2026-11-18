import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { POLL_INTERVAL_MS, queryKeys } from "../lib/queryClient";
import { getMyQueue } from "../services/queueService";
import { describeApiError } from "../services/apiClient";
import type { QueueEntry } from "../types/queue";

export function useQueueStatus() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.myQueue,
    queryFn: getMyQueue,
    enabled: isAuthenticated,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const entry: QueueEntry | null = query.data?.[0] ?? null;

  return {
    entry: isAuthenticated ? entry : null,
    error: isAuthenticated
      ? describeApiError(query.error, "Failed to load your queue status.")
      : "",
    loading: isAuthenticated && query.isPending,
  };
}
