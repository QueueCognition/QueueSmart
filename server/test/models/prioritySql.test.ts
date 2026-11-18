import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { db } from "../../src/db/sqlite";
import {
  clearQueueStore,
  insertEntry,
  listActiveEntries,
} from "../../src/models/queueStore";
import { PRIORITIES, PRIORITY_RANK } from "../../src/models/service";
import type { QueueEntryRecord } from "../../src/types/queue";

function entry(
  id: string,
  priority: QueueEntryRecord["priority"],
): QueueEntryRecord {
  return {
    id,
    serviceId: "s1",
    position: 1,
    estimatedWaitMinutes: 0,
    status: "waiting",
    joinedAt: "2026-11-18T09:00:00.000Z",
    updatedAt: "2026-11-18T09:00:00.000Z",
    priority,
    userId: `u_${id}`,
    customerName: "T",
    customerEmail: "t@e.com",
    date: "2026-11-18",
    timeSlot: "9:00 AM",
    ticketNumber: `T-${id}`,
  };
}

describe("sql priority ordering matches PRIORITY_RANK", () => {
  beforeEach(() => {
    clearQueueStore();
    db.exec("DELETE FROM services");
    db.prepare(
      "INSERT INTO services (id, name, description, expected_duration, priority) VALUES ('s1','S','d',10,'low')",
    ).run();
  });

  it("sorts highest rank first even with identical arrival times", () => {
    for (const priority of PRIORITIES) insertEntry(entry(priority, priority));

    const ordered = listActiveEntries("s1").map((row) => row.priority);
    const byRank = [...PRIORITIES].sort(
      (a, b) => PRIORITY_RANK[b] - PRIORITY_RANK[a],
    );

    assert.deepEqual(ordered, byRank);
  });
});
