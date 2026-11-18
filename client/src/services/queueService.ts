import type {
  QueueEntry,
  QueueServiceSummary,
  PublicQueueRow,
  Service,
  WaitEstimate,
} from "../types/queue";
import { apiDelete, apiGet, apiPost } from "./apiClient";
import { getServices as getManagedServices } from "./serviceApi";

export interface JoinQueueInput {
  serviceId: string;
  fullName: string;
  email: string;
  date: string;
  timeSlot: string;
}

const QUEUE_PATH = "queue";
const ADMIN_QUEUE_PATH = "admin/queues";

export async function getServices(): Promise<Service[]> {
  const services = await getManagedServices();

  return services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    expectedDuration: service.duration,
    priority: service.priority,
    isAvailable: service.isAvailable,
  }));
}

export function joinQueue(input: JoinQueueInput): Promise<QueueEntry> {
  return apiPost<QueueEntry>(`${QUEUE_PATH}/join`, {
    json: input,
    retry: 0,
  });
}

export function getMyQueue(): Promise<QueueEntry[]> {
  return apiGet<QueueEntry[]>(`${QUEUE_PATH}/mine`);
}

export function getQueueHistory(): Promise<QueueEntry[]> {
  return apiGet<QueueEntry[]>(`${QUEUE_PATH}/history`);
}

export function leaveQueue(entryId: string): Promise<QueueEntry> {
  return apiDelete<QueueEntry>(`${QUEUE_PATH}/${encodeURIComponent(entryId)}`);
}

export function getWaitEstimate(serviceId: string): Promise<WaitEstimate> {
  return apiGet<WaitEstimate>(
    `${QUEUE_PATH}/wait-time/${encodeURIComponent(serviceId)}`,
  );
}

export function getPublicQueueBoard(
  serviceId: string,
): Promise<PublicQueueRow[]> {
  return apiGet<PublicQueueRow[]>(
    `${QUEUE_PATH}/board/${encodeURIComponent(serviceId)}`,
  );
}

export function getAdminServiceWaitSummaries(): Promise<QueueServiceSummary[]> {
  return apiGet<QueueServiceSummary[]>(ADMIN_QUEUE_PATH);
}

export function serveNext(serviceId: string): Promise<{
  served: QueueEntry;
  nextUp: QueueEntry | null;
}> {
  return apiPost(
    `${ADMIN_QUEUE_PATH}/${encodeURIComponent(serviceId)}/serve-next`,
    { retry: 0 },
  );
}
