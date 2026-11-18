import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { POLL_INTERVAL_MS, queryKeys } from "../lib/queryClient";
import {
  getPublicQueueBoard,
  getServices,
  getWaitEstimate,
} from "../services/queueService";
import { getServices as getManagedServices } from "../services/serviceApi";
import type { Service as ManagedService } from "../services/serviceApi";
import type { PublicQueueRow, Service, WaitEstimate } from "../types/queue";

export function useServices(): UseQueryResult<Service[]> {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: getServices,
  });
}

export function useManagedServices(): UseQueryResult<ManagedService[]> {
  return useQuery({
    queryKey: queryKeys.adminServices,
    queryFn: getManagedServices,
  });
}

export function usePublicQueueBoard(
  serviceId: string | undefined,
): UseQueryResult<PublicQueueRow[]> {
  return useQuery({
    queryKey: queryKeys.queueBoard(serviceId ?? ""),
    queryFn: () => getPublicQueueBoard(serviceId as string),
    enabled: Boolean(serviceId),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useWaitEstimate(
  serviceId: string | undefined,
): UseQueryResult<WaitEstimate> {
  return useQuery({
    queryKey: queryKeys.waitEstimate(serviceId ?? ""),
    queryFn: () => getWaitEstimate(serviceId as string),
    enabled: Boolean(serviceId),
  });
}
