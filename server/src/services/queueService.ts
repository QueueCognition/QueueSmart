import { randomUUID } from "node:crypto";
import {
  insertEntry,
  listEntries,
  nextTicketSequence,
} from "../models/queueStore";
import type {
  PublicQueueRow,
  QueueEntryRecord,
  QueueSummaryRecord,
  ServeNextResult,
  Service,
  ServicePriority,
  WaitEstimate,
} from "../types/queue";
import { maskPatientName } from "../utils/maskName";
import { HttpError } from "../utils/errors";
import {
  estimateWaitForNewJoiner,
  estimateWaitMinutes,
} from "../utils/waitTime";
import type { JoinQueueInput } from "../validators/queueValidators";

export interface ServiceCatalog {
  list(): Service[] | Promise<Service[]>;
  find(serviceId: string): Service | undefined | Promise<Service | undefined>;
}

const PRIORITY_RANK: Record<ServicePriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function compareEntries(
  a: QueueEntryRecord,
  b: QueueEntryRecord,
): number {
  const byPriority = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (byPriority !== 0) return byPriority;
  return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
}

function isActive(entry: QueueEntryRecord): boolean {
  return entry.status === "waiting" || entry.status === "almost_ready";
}

function closeEntry(
  entry: QueueEntryRecord,
  status: "served" | "cancelled",
): void {
  entry.status = status;
  entry.position = 0;
  entry.estimatedWaitMinutes = 0;
  entry.updatedAt = new Date().toISOString();
}

function ticketPrefix(service: Service): string {
  const initials = service.name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return initials || "Q";
}

export class QueueService {
  private readonly catalog: ServiceCatalog;

  constructor(catalog: ServiceCatalog) {
    this.catalog = catalog;
  }

  private async requireService(serviceId: string): Promise<Service> {
    // Ensure string comparison matching regardless of spacing or type formatting
    const resolvedCatalog = await this.catalog.list();
    const match = resolvedCatalog.find(
      (s) => String(s.id) === String(serviceId).trim(),
    );

    if (!match) {
      throw new HttpError(404, "Service not found");
    }
    return match;
  }

  private findEntry(entryId: string): QueueEntryRecord {
    const entry = listEntries().find((e) => e.id === entryId);
    if (!entry) throw new HttpError(404, "Queue entry not found");
    return entry;
  }

  private activeEntries(serviceId: string): QueueEntryRecord[] {
    return listEntries()
      .filter(
        (e) => String(e.serviceId) === String(serviceId).trim() && isActive(e),
      )
      .sort(compareEntries);
  }

  private refresh(service: Service): void {
    this.activeEntries(service.id).forEach((entry, index) => {
      entry.position = index + 1;
      entry.estimatedWaitMinutes = estimateWaitMinutes(entry.position, service);
      entry.status = entry.position === 1 ? "almost_ready" : "waiting";
    });
  }

  private summarize(service: Service): QueueSummaryRecord {
    const waitingList = this.activeEntries(service.id).map((e) => ({ ...e }));
    const lastEntry = waitingList[waitingList.length - 1];
    return {
      service: { ...service },
      waitingCount: waitingList.length,
      estimatedWaitMinutes: lastEntry ? lastEntry.estimatedWaitMinutes : 0,
      waitingList,
    };
  }

  async join(userId: string, input: JoinQueueInput): Promise<QueueEntryRecord> {
    const service = await this.requireService(input.serviceId);

    if (!service.isAvailable) {
      throw new HttpError(
        409,
        `${service.name} is not accepting new entries right now`,
      );
    }

    const alreadyQueued = this.activeEntries(service.id).some(
      (e) => e.userId === userId,
    );
    if (alreadyQueued) {
      throw new HttpError(409, "You are already in the queue for this service");
    }

    const now = new Date().toISOString();

    const entry: QueueEntryRecord = {
      id: randomUUID(),
      serviceId: service.id,
      position: 0,
      estimatedWaitMinutes: 0,
      status: "waiting",
      joinedAt: now,
      updatedAt: now,
      priority: service.priority,
      userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      date: input.date,
      timeSlot: input.timeSlot,
      ticketNumber: `${ticketPrefix(service)}-${nextTicketSequence()}`,
    };

    insertEntry(entry);
    this.refresh(service);
    return { ...entry };
  }

  async leave(entryId: string, userId: string): Promise<QueueEntryRecord> {
    const entry = this.findEntry(entryId);

    if (entry.userId !== userId) {
      throw new HttpError(403, "You can only leave your own queue entry");
    }
    if (!isActive(entry)) {
      throw new HttpError(409, `This entry is already ${entry.status}`);
    }

    const service = await this.catalog.find(entry.serviceId);
    closeEntry(entry, "cancelled");
    if (service) this.refresh(service);
    return { ...entry };
  }

  getEntry(entryId: string, userId: string): QueueEntryRecord {
    const entry = this.findEntry(entryId);
    if (entry.userId !== userId) {
      throw new HttpError(403, "You can only view your own queue entry");
    }
    return { ...entry };
  }

  listForUser(userId: string): QueueEntryRecord[] {
    return listEntries()
      .filter((e) => e.userId === userId && isActive(e))
      .sort(
        (a, b) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      )
      .map((e) => ({ ...e }));
  }

  getHistoryForUser(userId: string): QueueEntryRecord[] {
    return listEntries()
      .filter((entry) => entry.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .map((entry) => ({ ...entry }));
  }

  async getWaitEstimate(serviceId: string): Promise<WaitEstimate> {
    const service = await this.requireService(serviceId);
    const waitingCount = this.activeEntries(serviceId).length;
    return {
      serviceId,
      waitingCount,
      expectedDuration: service.expectedDuration,
      estimatedWaitMinutes: estimateWaitForNewJoiner(waitingCount, service),
    };
  }

  async getPublicBoard(serviceId: string): Promise<PublicQueueRow[]> {
    await this.requireService(serviceId);
    return this.activeEntries(serviceId).map((entry) => ({
      position: entry.position,
      patient: maskPatientName(entry.customerName),
      date: entry.date,
      timeSlot: entry.timeSlot,
    }));
  }

  async getAdminQueue(serviceId: string): Promise<QueueSummaryRecord> {
    return this.summarize(await this.requireService(serviceId));
  }

  async listAdminQueues(): Promise<QueueSummaryRecord[]> {
    const services = await this.catalog.list();
    return services.map((service) => this.summarize(service));
  }

  async serveNext(serviceId: string): Promise<ServeNextResult> {
    const service = await this.requireService(serviceId);

    const [next] = this.activeEntries(serviceId);
    if (!next) throw new HttpError(409, "No one is waiting for this service");

    closeEntry(next, "served");
    this.refresh(service);

    const [nextUp] = this.activeEntries(serviceId);
    return { served: { ...next }, nextUp: nextUp ? { ...nextUp } : null };
  }
}
