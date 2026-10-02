import type { QueueStatus } from '../types/queue';
import {
  mockGetAdminServiceWaitSummaries,
  mockToggleAdminServiceAvailability,
  mockUpdateAdminQueueStatus,
  type AdminQueueEntry,
  type AdminServiceQueueSummary,
} from './mockAdminQueueService';

export type { AdminQueueEntry, AdminServiceQueueSummary };

export async function getAdminServiceWaitSummaries(): Promise<AdminServiceQueueSummary[]> {
  return mockGetAdminServiceWaitSummaries();
}

export async function updateAdminQueueStatus(
  entryId: string,
  status: QueueStatus
): Promise<AdminQueueEntry> {
  return mockUpdateAdminQueueStatus(entryId, status);
}

export async function toggleAdminServiceAvailability(serviceId: string): Promise<boolean> {
  return mockToggleAdminServiceAvailability(serviceId);
}
