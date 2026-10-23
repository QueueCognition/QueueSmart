import type { QueueEntry, QueueServiceSummary } from "../types/queue";
import {
  getAdminServiceWaitSummaries as getBackendQueueSummaries,
  serveNext,
} from "./queueService";

export type AdminQueueEntry = QueueEntry;
export type AdminServiceQueueSummary = QueueServiceSummary;

export function getAdminServiceWaitSummaries(): Promise<AdminServiceQueueSummary[]> {
  return getBackendQueueSummaries();
}

export function serveNextInQueue(serviceId: string) {
  return serveNext(serviceId);
}
