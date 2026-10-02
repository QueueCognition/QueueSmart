import type { QueueEntry, QueueStatus, Service } from '../types/queue';
import { getServices as getBaseServices } from './queueService';

export interface AdminQueueEntry extends QueueEntry {
  customerName?: string;
  customerEmail?: string;
  timeSlot?: string;
  ticketNumber?: string;
}

export interface AdminServiceQueueSummary {
  service: Service;
  waitingCount: number;
  estimatedWaitMinutes: number;
  waitingList: AdminQueueEntry[];
}

const ADMIN_QUEUES_STORAGE_KEY = 'queuesmart.admin.queues';
const ADMIN_SERVICE_STATUS_KEY = 'queuesmart.admin.service_status';

export const INITIAL_ADMIN_QUEUE_DATA: AdminQueueEntry[] = [
  {
    id: 'q-s1-1',
    serviceId: 's1',
    position: 1,
    estimatedWaitMinutes: 3,
    status: 'almost_ready',
    joinedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    ticketNumber: 'DMV-101',
    customerName: 'Sarah Connor',
    customerEmail: 's.connor@example.com',
    timeSlot: '9:00 AM',
  },
  {
    id: 'q-s1-2',
    serviceId: 's1',
    position: 2,
    estimatedWaitMinutes: 8,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    ticketNumber: 'DMV-102',
    customerName: 'Marcus Wright',
    customerEmail: 'm.wright@example.com',
    timeSlot: '9:30 AM',
  },
  {
    id: 'q-s1-3',
    serviceId: 's1',
    position: 3,
    estimatedWaitMinutes: 15,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    ticketNumber: 'DMV-103',
    customerName: 'Alex Johnson',
    customerEmail: 'alex.j@example.com',
    timeSlot: '10:00 AM',
  },
  {
    id: 'q-s1-4',
    serviceId: 's1',
    position: 4,
    estimatedWaitMinutes: 22,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    ticketNumber: 'DMV-104',
    customerName: 'John Connor',
    customerEmail: 'jconnor@example.com',
    timeSlot: '10:30 AM',
  },
  {
    id: 'q-s2-1',
    serviceId: 's2',
    position: 1,
    estimatedWaitMinutes: 2,
    status: 'almost_ready',
    joinedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    ticketNumber: 'SID-201',
    customerName: 'Elena Gilbert',
    customerEmail: 'elena.g@example.com',
    timeSlot: '9:30 AM',
  },
  {
    id: 'q-s2-2',
    serviceId: 's2',
    position: 2,
    estimatedWaitMinutes: 9,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    ticketNumber: 'SID-202',
    customerName: 'Stefan Salvatore',
    customerEmail: 'stefan.s@example.com',
    timeSlot: '10:00 AM',
  },
  {
    id: 'q-s3-1',
    serviceId: 's3',
    position: 1,
    estimatedWaitMinutes: 4,
    status: 'almost_ready',
    joinedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ticketNumber: 'FA-301',
    customerName: 'Jessica Pearson',
    customerEmail: 'j.pearson@example.com',
    timeSlot: '9:00 AM',
  },
  {
    id: 'q-s3-2',
    serviceId: 's3',
    position: 2,
    estimatedWaitMinutes: 14,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    ticketNumber: 'FA-302',
    customerName: 'Harvey Specter',
    customerEmail: 'harvey.s@example.com',
    timeSlot: '9:30 AM',
  },
  {
    id: 'q-s3-3',
    serviceId: 's3',
    position: 3,
    estimatedWaitMinutes: 24,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    ticketNumber: 'FA-303',
    customerName: 'Mike Ross',
    customerEmail: 'mike.ross@example.com',
    timeSlot: '10:00 AM',
  },
];

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function readStoredQueues(): AdminQueueEntry[] {
  try {
    const raw = localStorage.getItem(ADMIN_QUEUES_STORAGE_KEY);
    if (!raw) return [...INITIAL_ADMIN_QUEUE_DATA];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_ADMIN_QUEUE_DATA];
  } catch {
    return [...INITIAL_ADMIN_QUEUE_DATA];
  }
}

function persistQueues(queues: AdminQueueEntry[]): void {
  localStorage.setItem(ADMIN_QUEUES_STORAGE_KEY, JSON.stringify(queues));
}

function readServiceStatusMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ADMIN_SERVICE_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function persistServiceStatusMap(map: Record<string, boolean>): void {
  localStorage.setItem(ADMIN_SERVICE_STATUS_KEY, JSON.stringify(map));
}

export async function mockGetAdminServiceWaitSummaries(): Promise<AdminServiceQueueSummary[]> {
  const baseServices = await getBaseServices();
  const queues = readStoredQueues();
  const statusMap = readServiceStatusMap();

  const summaries: AdminServiceQueueSummary[] = baseServices.map((service) => {
    const isAvailable = statusMap[service.id] !== false;
    const activeEntries = queues
      .filter((q) => q.serviceId === service.id && (q.status === 'waiting' || q.status === 'almost_ready'))
      .sort((a, b) => a.position - b.position);

    const estimatedWaitMinutes = activeEntries.reduce(
      (total, entry) => Math.max(total, entry.estimatedWaitMinutes),
      activeEntries.length * service.expectedDuration
    );

    return {
      service: {
        ...service,
        isAvailable,
      } as Service & { isAvailable?: boolean },
      waitingCount: activeEntries.length,
      estimatedWaitMinutes,
      waitingList: activeEntries,
    };
  });

  return delay(summaries);
}

export async function mockUpdateAdminQueueStatus(
  entryId: string,
  status: QueueStatus
): Promise<AdminQueueEntry> {
  const queues = readStoredQueues();
  const target = queues.find((q) => q.id === entryId);
  if (!target) {
    throw new Error(`Queue entry not found: ${entryId}`);
  }

  const baseServices = await getBaseServices();
  const service = baseServices.find((s) => s.id === target.serviceId);
  const duration = service?.expectedDuration ?? 15;

  let updatedQueues = queues.map((q) => (q.id === entryId ? { ...q, status } : q));

  if (status === 'served' || status === 'cancelled') {
    let positionCounter = 1;
    updatedQueues = updatedQueues.map((q) => {
      if (q.serviceId === target.serviceId && (q.status === 'waiting' || q.status === 'almost_ready')) {
        const nextPos = positionCounter++;
        return {
          ...q,
          position: nextPos,
          estimatedWaitMinutes: nextPos * duration,
          status: nextPos === 1 ? ('almost_ready' as QueueStatus) : ('waiting' as QueueStatus),
        };
      }
      return q;
    });
  }

  persistQueues(updatedQueues);
  const result = updatedQueues.find((q) => q.id === entryId)!;
  return delay(result);
}

export async function mockToggleAdminServiceAvailability(serviceId: string): Promise<boolean> {
  const statusMap = readServiceStatusMap();
  const current = statusMap[serviceId] !== false;
  const next = !current;
  statusMap[serviceId] = next;
  persistServiceStatusMap(statusMap);
  return delay(next);
}
