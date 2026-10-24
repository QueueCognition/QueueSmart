import type { QueueEntryRecord } from "../types/queue";

const entries: QueueEntryRecord[] = [];
let ticketSequence = 100;

export function listEntries(): QueueEntryRecord[] {
  return entries;
}

export function insertEntry(entry: QueueEntryRecord): void {
  entries.push(entry);
}

export function nextTicketSequence(): number {
  ticketSequence += 1;
  return ticketSequence;
}

export function clearQueueStore(): void {
  entries.length = 0;
  ticketSequence = 100;
}
