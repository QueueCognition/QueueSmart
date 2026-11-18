import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { db } from "../../src/db/sqlite";
import {
  clearQueueStore,
  insertEntry,
  listEntries,
  reprioritize,
} from "../../src/models/queueStore";
import { compareEntries } from "../../src/services/queueService";
import type { QueueEntryRecord, ServicePriority } from "../../src/types/queue";

function entry(
  id: string,
  priority: ServicePriority,
  joinedAt: string,
  serviceId = "s1",
): QueueEntryRecord {
  return {
    id,
    serviceId,
    position: 1,
    estimatedWaitMinutes: 0,
    status: "waiting",
    joinedAt,
    updatedAt: joinedAt,
    priority,
    userId: `u_${id}`,
    customerName: "Test User",
    customerEmail: "test@example.com",
    date: "2026-11-18",
    timeSlot: "9:00 AM",
    ticketNumber: `T-${id}`,
  };
}

function activeFor(serviceId: string): QueueEntryRecord[] {
  return listEntries()
    .filter(
      (row) =>
        row.serviceId === serviceId &&
        (row.status === "waiting" || row.status === "almost_ready"),
    )
    .sort((a, b) => a.position - b.position);
}

describe("reprioritize", () => {
  beforeEach(() => {
    clearQueueStore();
    db.exec("DELETE FROM services");

    const insertService = db.prepare(
      `INSERT INTO services (id, name, description, expected_duration, priority)
       VALUES (?, ?, 'd', 10, 'medium')`,
    );
    insertService.run("s1", "Service One");
    insertService.run("s2", "Service Two");
  });

  it("matches the JavaScript ordering for priority and arrival", () => {
    const entries = [
      entry("low-early", "low", "2026-11-18T09:00:00.000Z"),
      entry("high-late", "high", "2026-11-18T09:30:00.000Z"),
      entry("medium", "medium", "2026-11-18T09:10:00.000Z"),
      entry("high-early", "high", "2026-11-18T08:50:00.000Z"),
      entry("low-late", "low", "2026-11-18T09:20:00.000Z"),
    ];
    for (const row of entries) insertEntry(row);

    const expected = [...entries].sort(compareEntries).map((row) => row.id);

    reprioritize("s1", 15);

    assert.deepEqual(
      activeFor("s1").map((row) => row.id),
      expected,
    );
  });

  it("assigns sequential positions and wait estimates from the service duration", () => {
    for (const [index, priority] of (
      ["low", "medium", "high"] as const
    ).entries()) {
      insertEntry(
        entry(`e${index}`, priority, `2026-11-18T09:0${index}:00.000Z`),
      );
    }

    reprioritize("s1", 20);

    const ordered = activeFor("s1");
    assert.deepEqual(
      ordered.map((row) => row.position),
      [1, 2, 3],
    );
    assert.deepEqual(
      ordered.map((row) => row.estimatedWaitMinutes),
      [20, 40, 60],
    );
  });

  it("marks only the first entry as almost_ready", () => {
    insertEntry(entry("a", "high", "2026-11-18T09:00:00.000Z"));
    insertEntry(entry("b", "low", "2026-11-18T09:05:00.000Z"));

    reprioritize("s1", 10);

    assert.deepEqual(
      activeFor("s1").map((row) => [row.position, row.status]),
      [
        [1, "almost_ready"],
        [2, "waiting"],
      ],
    );
  });

  it("leaves other services untouched", () => {
    insertEntry(entry("s1-a", "high", "2026-11-18T09:00:00.000Z", "s1"));
    insertEntry(entry("s2-a", "low", "2026-11-18T09:00:00.000Z", "s2"));

    reprioritize("s1", 10);

    const other = listEntries().find((row) => row.id === "s2-a");
    assert.equal(other?.position, 1);
    assert.equal(other?.estimatedWaitMinutes, 0);
    assert.equal(other?.status, "waiting");
  });

  it("breaks ties on insertion order when priority and arrival match", () => {
    insertEntry(entry("first", "medium", "2026-11-18T09:00:00.000Z"));
    insertEntry(entry("second", "medium", "2026-11-18T09:00:00.000Z"));

    reprioritize("s1", 10);

    assert.deepEqual(
      activeFor("s1").map((row) => row.id),
      ["first", "second"],
    );
  });

  it("does not touch closed entries", () => {
    const served = entry("served", "high", "2026-11-18T08:00:00.000Z");
    served.status = "served";
    served.position = 0;
    insertEntry(served);
    insertEntry(entry("waiting", "low", "2026-11-18T09:00:00.000Z"));

    reprioritize("s1", 10);

    const closed = db
      .prepare(
        "SELECT position, estimated_wait_minutes, status FROM queue_entries WHERE id = ?",
      )
      .get("served") as {
      position: number;
      estimated_wait_minutes: number;
      status: string;
    };
    assert.deepEqual(
      [closed.position, closed.estimated_wait_minutes, closed.status],
      [0, 0, "served"],
    );
  });
});
