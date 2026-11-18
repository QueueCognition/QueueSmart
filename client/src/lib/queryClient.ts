import { QueryClient } from "@tanstack/react-query";

export const POLL_INTERVAL_MS = 5000;

export const queryKeys = {
  services: ["services"] as const,
  adminServices: ["services", "admin"] as const,
  myQueue: ["queue", "mine"] as const,
  queueHistory: ["queue", "history"] as const,
  queueBoard: (serviceId: string) => ["queue", "board", serviceId] as const,
  waitEstimate: (serviceId: string) =>
    ["queue", "wait-estimate", serviceId] as const,
  adminQueues: ["admin", "queues"] as const,
  notifications: ["notifications"] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: POLL_INTERVAL_MS,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
