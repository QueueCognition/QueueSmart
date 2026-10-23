import { beforeEach, describe, expect, it } from "vitest";
import { clearQueueStore } from "../src/models/queueStore";
import {
  compareEntries,
  QueueService,
  type ServiceCatalog,
} from "../src/services/queueService";
import type { QueueEntryRecord, Service } from "../src/types/queue";
import type { JoinQueueInput } from "../src/validators/queueValidators";

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

let queue: QueueService;

beforeEach(() => {
  clearQueueStore();
  queue = new QueueService(catalog);
});

describe("joining a queue", () => {
  it("puts the first person at position 1 as almost_ready", async () => {
    const entry = await queue.join("user-1", joinInput());
    expect(entry.position).toBe(1);
    expect(entry.status).toBe("almost_ready");
    expect(entry.estimatedWaitMinutes).toBe(15);
    expect(entry.userId).toBe("user-1");
  });

  it("puts later arrivals behind, with wait = position x duration", async () => {
    await queue.join("user-1", joinInput());
    const second = await queue.join("user-2", joinInput());
    const third = await queue.join("user-3", joinInput());

    expect(second.position).toBe(2);
    expect(second.status).toBe("waiting");
    expect(second.estimatedWaitMinutes).toBe(30);
    expect(third.position).toBe(3);
    expect(third.estimatedWaitMinutes).toBe(45);
  });

  it("builds ticket numbers from the service name", async () => {
    const first = await queue.join("user-1", joinInput());
    const second = await queue.join("user-2", joinInput());
    expect(first.ticketNumber).toBe("DLR-101");
    expect(second.ticketNumber).toBe("DLR-102");
  });

  it("keeps separate queues per service", async () => {
    await queue.join("user-1", joinInput({ serviceId: "s1" }));
    const other = await queue.join("user-1", joinInput({ serviceId: "s2" }));
    expect(other.position).toBe(1);
  });

  it("rejects an unknown service with 404", async () => {
    await expect(
      queue.join("user-1", joinInput({ serviceId: "nope" })),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects an unavailable service with 409", async () => {
    await expect(
      queue.join("user-1", joinInput({ serviceId: "s3" })),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects joining the same service twice with 409", async () => {
    await queue.join("user-1", joinInput());
    await expect(queue.join("user-1", joinInput())).rejects.toMatchObject({
      status: 409,
    });
  });

  it("lets a user rejoin after leaving", async () => {
    const entry = await queue.join("user-1", joinInput());
    await queue.leave(entry.id, "user-1");
    const again = await queue.join("user-1", joinInput());
    expect(again.position).toBe(1);
  });
});

describe("leaving a queue", () => {
  it("cancels the entry and moves everyone behind it up", async () => {
    const first = await queue.join("user-1", joinInput());
    await queue.join("user-2", joinInput());
    await queue.join("user-3", joinInput());

    const left = await queue.leave(first.id, "user-1");
    expect(left.status).toBe("cancelled");

    const { waitingList } = await queue.getAdminQueue("s1");
    expect(waitingList.map((e) => e.userId)).toEqual(["user-2", "user-3"]);
    expect(waitingList[0]?.position).toBe(1);
    expect(waitingList[0]?.status).toBe("almost_ready");
    expect(waitingList[1]?.estimatedWaitMinutes).toBe(30);
  });

  it("only lets users leave their own entry (403)", async () => {
    const entry = await queue.join("user-1", joinInput());
    await expect(queue.leave(entry.id, "someone-else")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("returns 404 for an unknown entry", async () => {
    await expect(queue.leave("missing", "user-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("returns 409 when leaving twice", async () => {
    const entry = await queue.join("user-1", joinInput());
    await queue.leave(entry.id, "user-1");
    await expect(queue.leave(entry.id, "user-1")).rejects.toMatchObject({
      status: 409,
    });
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
    expect(left.status).toBe("cancelled");
  });
});

describe("reading entries", () => {
  it("lists only the user's own active entries", async () => {
    await queue.join("user-1", joinInput({ serviceId: "s1" }));
    await queue.join("user-1", joinInput({ serviceId: "s2" }));
    await queue.join("user-2", joinInput({ serviceId: "s1" }));

    const mine = queue.listForUser("user-1");
    expect(mine).toHaveLength(2);
    expect(mine.every((e) => e.userId === "user-1")).toBe(true);
  });

  it("drops left entries from the user's list", async () => {
    const entry = await queue.join("user-1", joinInput());
    await queue.leave(entry.id, "user-1");
    expect(queue.listForUser("user-1")).toHaveLength(0);
  });

  it("returns the user's completed and cancelled entries as history", async () => {
    await queue.join("user-1", joinInput());
    await queue.serveNext("s1");

    const cancelled = await queue.join(
      "user-1",
      joinInput({ serviceId: "s2" }),
    );
    await queue.leave(cancelled.id, "user-1");

    const history = queue.getHistoryForUser("user-1");

    expect(history).toHaveLength(2);
    expect(history.map((entry) => entry.status)).toContain("served");
    expect(history.map((entry) => entry.status)).toContain("cancelled");
  });

  it("returns only the requesting user's history", async () => {
    const user1Entry = await queue.join("user-1", joinInput());
    const user2Entry = await queue.join("user-2", joinInput());

    await queue.leave(user1Entry.id, "user-1");
    await queue.leave(user2Entry.id, "user-2");

    const history = queue.getHistoryForUser("user-1");

    expect(history).toHaveLength(1);
    expect(history[0]?.userId).toBe("user-1");
  });

  it("lets the owner read an entry but not other users", async () => {
    const entry = await queue.join("user-1", joinInput());
    expect(queue.getEntry(entry.id, "user-1").id).toBe(entry.id);
    expect(() => queue.getEntry(entry.id, "user-2")).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
    expect(() => queue.getEntry("missing", "user-1")).toThrowError(
      expect.objectContaining({ status: 404 }),
    );
  });
});

describe("serving the next user", () => {
  it("serves position 1 and promotes the next person", async () => {
    await queue.join("user-1", joinInput());
    await queue.join("user-2", joinInput());

    const { served, nextUp } = await queue.serveNext("s1");
    expect(served.userId).toBe("user-1");
    expect(served.status).toBe("served");
    expect(nextUp?.userId).toBe("user-2");
    expect(nextUp?.position).toBe(1);
    expect(nextUp?.status).toBe("almost_ready");
  });

  it("returns nextUp as null when the queue empties", async () => {
    await queue.join("user-1", joinInput());
    const result = await queue.serveNext("s1");
    expect(result.nextUp).toBeNull();
  });

  it("returns 409 when nobody is waiting", async () => {
    await expect(queue.serveNext("s1")).rejects.toMatchObject({ status: 409 });
  });

  it("returns 404 for an unknown service", async () => {
    await expect(queue.serveNext("nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("admin summaries", () => {
  it("summarizes every service, including empty ones", async () => {
    await queue.join("user-1", joinInput({ serviceId: "s1" }));
    await queue.join("user-2", joinInput({ serviceId: "s1" }));

    const summaries = await queue.listAdminQueues();
    expect(summaries).toHaveLength(3);

    const s1 = summaries.find((s) => s.service.id === "s1");
    expect(s1?.waitingCount).toBe(2);
    expect(s1?.estimatedWaitMinutes).toBe(30);

    const s2 = summaries.find((s) => s.service.id === "s2");
    expect(s2?.waitingCount).toBe(0);
    expect(s2?.estimatedWaitMinutes).toBe(0);
  });
});

describe("wait estimate for a new joiner", () => {
  it("is one duration for an empty queue", async () => {
    expect((await queue.getWaitEstimate("s1")).estimatedWaitMinutes).toBe(15);
  });

  it("grows as people join", async () => {
    await queue.join("user-1", joinInput());
    await queue.join("user-2", joinInput());
    const estimate = await queue.getWaitEstimate("s1");
    expect(estimate.waitingCount).toBe(2);
    expect(estimate.estimatedWaitMinutes).toBe(45);
  });

  it("returns 404 for an unknown service", async () => {
    await expect(queue.getWaitEstimate("nope")).rejects.toMatchObject({
      status: 404,
    });
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
    expect([late, early].sort(compareEntries).map((e) => e.id)).toEqual([
      "early",
      "late",
    ]);
  });

  it("puts higher priority first even if it arrived later", () => {
    const lowEarly = record({ id: "low", priority: "low", joinedAt: "2026-10-22T09:00:00.000Z" });
    const medium = record({ id: "med", priority: "medium", joinedAt: "2026-10-22T09:10:00.000Z" });
    const highLate = record({ id: "high", priority: "high", joinedAt: "2026-10-22T09:30:00.000Z" });
    expect(
      [lowEarly, medium, highLate].sort(compareEntries).map((e) => e.id),
    ).toEqual(["high", "med", "low"]);
  });

  describe("public board", () => {
  it("lists active entries in order with masked names and no private fields", async () => {
    await queue.join("user-1", joinInput({ customerName: "Alex Johnson", customerEmail: "alex@example.com" }));
    await queue.join("user-2", joinInput({ customerName: "Maria Garcia" }));

    const board = await queue.getPublicBoard("s1");
    expect(board).toEqual([
      { position: 1, patient: "Ale J.", date: today, timeSlot: "9:00 AM" },
      { position: 2, patient: "Mar G.", date: today, timeSlot: "9:00 AM" },
    ]);
  });

  it("drops people who left", async () => {
    const entry = await queue.join("user-1", joinInput());
    await queue.leave(entry.id, "user-1");
    expect(await queue.getPublicBoard("s1")).toEqual([]);
  });

  it("returns 404 for an unknown service", async () => {
    await expect(queue.getPublicBoard("nope")).rejects.toMatchObject({ status: 404 });
  });
});
});