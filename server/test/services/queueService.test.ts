import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { db } from "../../src/db/sqlite";
import { clearQueueStore } from "../../src/models/queueStore";
import {
  compareEntries,
  QueueService,
  type ServiceCatalog,
} from "../../src/services/queueService";
import type { QueueEntryRecord, Service } from "../../src/types/queue";
import type { JoinQueueInput } from "../../src/validators/queueValidators";

const today = new Date().toISOString().slice(0, 10);

const testServices: Service[] = [
  {
    id: "s1",
    name: "DMV License Renewal",
    description: "Renew your license",
    expectedDuration: 15,
    priority: "medium",
    isAvailable: true,
  },
  {
    id: "s2",
    name: "Student ID Card",
    description: "Get an ID card",
    expectedDuration: 10,
    priority: "low",
    isAvailable: true,
  },
  {
    id: "s3",
    name: "Closed Service",
    description: "Not taking entries",
    expectedDuration: 5,
    priority: "low",
    isAvailable: false,
  },
];

const catalog: ServiceCatalog = {
  list: () => testServices,
  find: (id) => testServices.find((s) => s.id === id),
};

function joinInput(overrides: Partial<JoinQueueInput> = {}): JoinQueueInput {
  return {
    serviceId: "s1",
    customerName: "Jamie Win",
    customerEmail: "jamie@example.com",
    date: today,
    timeSlot: "9:00 AM",
    ...overrides,
  };
}

function statusIs(error: unknown, status: number): boolean {
  assert.equal((error as { status?: number }).status, status);
  return true;
}

async function rejectsWithStatus(promise: Promise<unknown>, status: number): Promise<void> {
  await assert.rejects(promise, (error: unknown) => statusIs(error, status));
}

let queue: QueueService;

beforeEach(() => {
  clearQueueStore();
  const timestamp = new Date().toISOString();
  const insertService = db.prepare(
    `INSERT OR IGNORE INTO services
     (id, name, description, expected_duration, priority)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const service of testServices) {
    insertService.run(
      service.id,
      service.name,
      service.description,
      service.expectedDuration,
      service.priority,
    );
  }
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
     (id, first_name, last_name, email, role, password_hash, created_at)
     VALUES (?, 'Test', 'User', ?, 'user', 'test-hash', ?)`,
  );
  for (const id of ["user-1", "user-2", "user-3", "someone-else"]) {
    insertUser.run(id, `${id}@example.com`, timestamp);
  }
  queue = new QueueService(catalog);
});

describe("joining a queue", () => {
  it("puts the first person at position 1 as almost_ready", async () => {
    const entry = await queue.join("user-1", joinInput());
    assert.equal(entry.position, 1);
    assert.equal(entry.status, "almost_ready");
    assert.equal(entry.estimatedWaitMinutes, 15);
    assert.equal(entry.userId, "user-1");
  });

  it("puts later arrivals behind, with wait = position x duration", async () => {
    await queue.join("user-1", joinInput());
    const second = await queue.join("user-2", joinInput());
    const third = await queue.join("user-3", joinInput());

    assert.equal(second.position, 2);
    assert.equal(second.status, "waiting");
    assert.equal(second.estimatedWaitMinutes, 30);
    assert.equal(third.position, 3);
    assert.equal(third.estimatedWaitMinutes, 45);
  });

  it("builds ticket numbers from the service name", async () => {
    const first = await queue.join("user-1", joinInput());
    const second = await queue.join("user-2", joinInput());
    assert.equal(first.ticketNumber, "DLR-101");
    assert.equal(second.ticketNumber, "DLR-102");
  });

  it("keeps separate queues per service", async () => {
    await queue.join("user-1", joinInput({ serviceId: "s1" }));
    const other = await queue.join("user-1", joinInput({ serviceId: "s2" }));
    assert.equal(other.position, 1);
  });

  it("rejects an unknown service with 404", async () => {
    await rejectsWithStatus(queue.join("user-1", joinInput({ serviceId: "nope" })), 404);
  });

  it("rejects an unavailable service with 409", async () => {
    await rejectsWithStatus(queue.join("user-1", joinInput({ serviceId: "s3" })), 409);
  });

  it("rejects joining the same service twice with 409", async () => {
    await queue.join("user-1", joinInput());
    await rejectsWithStatus(queue.join("user-1", joinInput()), 409);
  });

  it("lets a user rejoin after leaving", async () => {
    const entry = await queue.join("user-1", joinInput());
    await queue.leave(entry.id, "user-1");
    const again = await queue.join("user-1", joinInput());
    assert.equal(again.position, 1);

    const queueStatuses = db
      .prepare("SELECT status FROM queues WHERE service_id = ? ORDER BY rowid")
      .all("s1") as { status: string }[];
    assert.deepEqual(
      queueStatuses.map(({ status }) => status),
      ["closed", "open"],
    );
    assert.equal(
      new QueueService(catalog).getHistoryForUser("user-1").length,
      2,
    );
  });
});

describe("leaving a queue", () => {
  it("cancels the entry and moves everyone behind it up", async () => {
    const first = await queue.join("user-1", joinInput());
    await queue.join("user-2", joinInput());
    await queue.join("user-3", joinInput());

    const left = await queue.leave(first.id, "user-1");
    assert.equal(left.status, "cancelled");

    const { waitingList } = await queue.getAdminQueue("s1");
    assert.deepEqual(waitingList.map((e) => e.userId), ["user-2", "user-3"]);
    assert.equal(waitingList[0]?.position, 1);
    assert.equal(waitingList[0]?.status, "almost_ready");
    assert.equal(waitingList[1]?.estimatedWaitMinutes, 30);
  });

  it("only lets users leave their own entry (403)", async () => {
    const entry = await queue.join("user-1", joinInput());
    await rejectsWithStatus(queue.leave(entry.id, "someone-else"), 403);
  });

  it("returns 404 for an unknown entry", async () => {
    await rejectsWithStatus(queue.leave("missing", "user-1"), 404);
  });

  it("returns 409 when leaving twice", async () => {
    const entry = await queue.join("user-1", joinInput());
    await queue.leave(entry.id, "user-1");
    await rejectsWithStatus(queue.leave(entry.id, "user-1"), 409);
  });

  it("still lets a user leave after their service was removed", async () => {
    const services = [...testServices];
    const shrinkingQueue = new QueueService({
      list: () => services,
      find: (id) => services.find((s) => s.id === id),
    });

    const entry = await shrinkingQueue.join("user-1", joinInput());
    services.length = 0; // the service is deleted

    const left = await shrinkingQueue.leave(entry.id, "user-1");
    assert.equal(left.status, "cancelled");
  });
});

describe("reading entries", () => {
  it("lists only the user's own active entries", async () => {
    await queue.join("user-1", joinInput({ serviceId: "s1" }));
    await queue.join("user-1", joinInput({ serviceId: "s2" }));
    await queue.join("user-2", joinInput({ serviceId: "s1" }));

    const mine = queue.listForUser("user-1");
    assert.equal(mine.length, 2);
    assert.ok(mine.every((e) => e.userId === "user-1"));
  });

  it("drops left entries from the user's list", async () => {
    const entry = await queue.join("user-1", joinInput());
    await queue.leave(entry.id, "user-1");
    assert.equal(queue.listForUser("user-1").length, 0);
  });

  it("returns the user's completed and cancelled entries as history", async () => {
    await queue.join("user-1", joinInput());
    await queue.serveNext("s1");

    const cancelled = await queue.join("user-1", joinInput({ serviceId: "s2" }));
    await queue.leave(cancelled.id, "user-1");

    const history = queue.getHistoryForUser("user-1");

    assert.equal(history.length, 2);
    assert.ok(history.map((entry) => entry.status).includes("served"));
    assert.ok(history.map((entry) => entry.status).includes("cancelled"));
  });

  it("returns only the requesting user's history", async () => {
    const user1Entry = await queue.join("user-1", joinInput());
    const user2Entry = await queue.join("user-2", joinInput());

    await queue.leave(user1Entry.id, "user-1");
    await queue.leave(user2Entry.id, "user-2");

    const history = queue.getHistoryForUser("user-1");

    assert.equal(history.length, 1);
    assert.equal(history[0]?.userId, "user-1");
  });

  it("lets the owner read an entry but not other users", async () => {
    const entry = await queue.join("user-1", joinInput());
    assert.equal(queue.getEntry(entry.id, "user-1").id, entry.id);
    assert.throws(() => queue.getEntry(entry.id, "user-2"), (error: unknown) =>
      statusIs(error, 403),
    );
    assert.throws(() => queue.getEntry("missing", "user-1"), (error: unknown) =>
      statusIs(error, 404),
    );
  });
});

describe("serving the next user", () => {
  it("serves position 1 and promotes the next person", async () => {
    await queue.join("user-1", joinInput());
    await queue.join("user-2", joinInput());

    const { served, nextUp } = await queue.serveNext("s1");
    assert.equal(served.userId, "user-1");
    assert.equal(served.status, "served");
    assert.equal(nextUp?.userId, "user-2");
    assert.equal(nextUp?.position, 1);
    assert.equal(nextUp?.status, "almost_ready");
  });

  it("returns nextUp as null when the queue empties", async () => {
    await queue.join("user-1", joinInput());
    const result = await queue.serveNext("s1");
    assert.equal(result.nextUp, null);
  });

  it("returns 409 when nobody is waiting", async () => {
    await rejectsWithStatus(queue.serveNext("s1"), 409);
  });

  it("returns 404 for an unknown service", async () => {
    await rejectsWithStatus(queue.serveNext("nope"), 404);
  });
});

describe("admin summaries", () => {
  it("summarizes every service, including empty ones", async () => {
    await queue.join("user-1", joinInput({ serviceId: "s1" }));
    await queue.join("user-2", joinInput({ serviceId: "s1" }));

    const summaries = await queue.listAdminQueues();
    assert.equal(summaries.length, 3);

    const s1 = summaries.find((s) => s.service.id === "s1");
    assert.equal(s1?.waitingCount, 2);
    assert.equal(s1?.estimatedWaitMinutes, 30);

    const s2 = summaries.find((s) => s.service.id === "s2");
    assert.equal(s2?.waitingCount, 0);
    assert.equal(s2?.estimatedWaitMinutes, 0);
  });
});

describe("wait estimate for a new joiner", () => {
  it("is one duration for an empty queue", async () => {
    assert.equal((await queue.getWaitEstimate("s1")).estimatedWaitMinutes, 15);
  });

  it("grows as people join", async () => {
    await queue.join("user-1", joinInput());
    await queue.join("user-2", joinInput());
    const estimate = await queue.getWaitEstimate("s1");
    assert.equal(estimate.waitingCount, 2);
    assert.equal(estimate.estimatedWaitMinutes, 45);
  });

  it("returns 404 for an unknown service", async () => {
    await rejectsWithStatus(queue.getWaitEstimate("nope"), 404);
  });
});

describe("queue ordering", () => {
  function record(overrides: Partial<QueueEntryRecord>): QueueEntryRecord {
    return {
      id: "x",
      serviceId: "s1",
      position: 0,
      estimatedWaitMinutes: 0,
      status: "waiting",
      joinedAt: "2026-10-22T09:00:00.000Z",
      updatedAt: "2026-10-22T09:00:00.000Z",
      priority: "low",
      userId: "u",
      customerName: "n",
      customerEmail: "e@e.com",
      date: today,
      timeSlot: "9:00 AM",
      ticketNumber: "T-1",
      ...overrides,
    };
  }

  it("orders by arrival when priorities are equal", () => {
    const early = record({ id: "early", joinedAt: "2026-10-22T09:00:00.000Z" });
    const late = record({ id: "late", joinedAt: "2026-10-22T09:05:00.000Z" });
    assert.deepEqual([late, early].sort(compareEntries).map((e) => e.id), [
      "early",
      "late",
    ]);
  });

  it("puts higher priority first even if it arrived later", () => {
    const lowEarly = record({ id: "low", priority: "low", joinedAt: "2026-10-22T09:00:00.000Z" });
    const medium = record({ id: "med", priority: "medium", joinedAt: "2026-10-22T09:10:00.000Z" });
    const highLate = record({ id: "high", priority: "high", joinedAt: "2026-10-22T09:30:00.000Z" });
    assert.deepEqual(
      [lowEarly, medium, highLate].sort(compareEntries).map((e) => e.id),
      ["high", "med", "low"],
    );
  });

  describe("public board", () => {
    it("lists active entries in order with masked names and no private fields", async () => {
      await queue.join(
        "user-1",
        joinInput({ customerName: "Alex Johnson", customerEmail: "alex@example.com" }),
      );
      await queue.join("user-2", joinInput({ customerName: "Maria Garcia" }));

      const board = await queue.getPublicBoard("s1");
      assert.deepEqual(board, [
        { position: 1, patient: "Ale J.", date: today, timeSlot: "9:00 AM" },
        { position: 2, patient: "Mar G.", date: today, timeSlot: "9:00 AM" },
      ]);
    });

    it("drops people who left", async () => {
      const entry = await queue.join("user-1", joinInput());
      await queue.leave(entry.id, "user-1");
      assert.deepEqual(await queue.getPublicBoard("s1"), []);
    });

    it("returns 404 for an unknown service", async () => {
      await rejectsWithStatus(queue.getPublicBoard("nope"), 404);
    });
  });
});
