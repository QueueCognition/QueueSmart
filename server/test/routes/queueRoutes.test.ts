import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { config } from "../../src/config/env";
import { db } from "../../src/db/sqlite";
import { errorHandler } from "../../src/middleware/errorHandler";
import { clearQueueStore } from "../../src/models/queueStore";
import { insertUser } from "../../src/models/userStore";
import {
  createAdminQueueRoutes,
  createQueueRoutes,
} from "../../src/routes/queueRoutes";
import { createQueueCatalog } from "../../src/services/queueCatalog";
import { QueueService } from "../../src/services/queueService";
import { ServiceService } from "../../src/services/serviceService";
import type { UserRole } from "../../src/types/auth";
import { issueToken } from "../../src/utils/token";

const today = new Date().toISOString().slice(0, 10);

const seededUsers: { id: string; role: UserRole }[] = [
  { id: "user-a", role: "user" },
  { id: "user-b", role: "user" },
  { id: "staff-1", role: "staff" },
  { id: "admin-1", role: "admin" },
];

before(() => {
  for (const user of seededUsers) {
    insertUser({
      id: user.id,
      firstName: "Test",
      lastName: user.id,
      email: `${user.id}@example.com`,
      password: "password123",
      role: user.role,
    });
  }
});

function actingAs(id: string, role: UserRole = "user") {
  const { token } = issueToken(
    id,
    role,
    null,
    config.jwtSecret,
    config.tokenTtlSeconds,
    0,
  );
  return { authorization: `Bearer ${token}` };
}

function joinBody(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: "1",
    fullName: "Jamie Win",
    email: "jamie@example.com",
    date: today,
    timeSlot: "9:00 AM",
    ...overrides,
  };
}

function buildApp() {
  const queueService = new QueueService(createQueueCatalog(new ServiceService()));
  const app = express();
  app.use(express.json());
  app.use("/api/queue", createQueueRoutes(queueService));
  app.use("/api/admin/queues", createAdminQueueRoutes(queueService));
  app.use(errorHandler);
  return app;
}

let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  clearQueueStore();

  const serviceService = new ServiceService(db);

  if (serviceService.listServices().length === 0) {
    serviceService.createService({
      name: "Student ID Card",
      description: "Student identification card services.",
      duration: 15,
      priority: "medium",
    });

    serviceService.createService({
      name: "Financial Aid Consultation",
      description: "Assistance with financial aid questions and applications.",
      duration: 30,
      priority: "high",
    });

    serviceService.createService({
      name: "DMV License Renewal",
      description: "License renewal and related documentation services.",
      duration: 20,
      priority: "low",
    });
  }

  app = buildApp();
});

describe("POST /api/queue/join", () => {
  it("creates an entry owned by the logged-in user", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    assert.equal(res.status, 201);
    assert.equal(res.body.userId, "user-a");
    assert.equal(res.body.serviceId, "1");
    assert.equal(res.body.position, 1);
    assert.equal(res.body.status, "almost_ready");
    assert.equal(res.body.estimatedWaitMinutes, 15);
  });

  it("returns 401 when not logged in", async () => {
    const res = await request(app).post("/api/queue/join").send(joinBody());
    assert.equal(res.status, 401);
  });

  it("returns 400 with fieldErrors for a bad body", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody({ email: "nope", fullName: "" }));

    assert.equal(res.status, 400);
    assert.notEqual(res.body.fieldErrors.email, undefined);
    assert.notEqual(res.body.fieldErrors.fullName, undefined);
  });

  it("returns 404 for an unknown service", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody({ serviceId: "99" }));
    assert.equal(res.status, 404);
  });

  it("returns 409 while the service is paused", async () => {
    new ServiceService(db).setAvailability(1, false);

    try {
      const res = await request(app)
        .post("/api/queue/join")
        .set(actingAs("user-a"))
        .send(joinBody());

      assert.equal(res.status, 409);
      assert.match(String(res.body?.message), /not accepting new entries/i);
    } finally {
      new ServiceService(db).setAvailability(1, true);
    }
  });

  it("accepts new entries once the service is resumed", async () => {
    const serviceService = new ServiceService(db);

    serviceService.setAvailability(1, false);
    serviceService.setAvailability(1, true);

    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    assert.equal(res.status, 201);
  });

  it("still serves the existing queue while the service is paused", async () => {
    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    new ServiceService(db).setAvailability(1, false);

    try {
      const res = await request(app)
        .post("/api/admin/queues/1/serve-next")
        .set(actingAs("staff-1", "staff"));

      assert.equal(res.status, 200);
      assert.equal(res.body.served.userId, "user-a");
    } finally {
      new ServiceService(db).setAvailability(1, true);
    }
  });

  it("returns 409 when the user joins the same service twice", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());
    assert.equal(res.status, 409);
  });
});

describe("GET /api/queue/wait-time/:serviceId", () => {
  it("is public and estimates for a new joiner", async () => {
    const empty = await request(app).get("/api/queue/wait-time/1");
    assert.equal(empty.status, 200);
    assert.equal(empty.body.waitingCount, 0);
    assert.equal(empty.body.estimatedWaitMinutes, 15);

    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    const busy = await request(app).get("/api/queue/wait-time/1");
    assert.equal(busy.body.waitingCount, 1);
    assert.equal(busy.body.estimatedWaitMinutes, 30);
  });

  it("returns 404 for an unknown service", async () => {
    const res = await request(app).get("/api/queue/wait-time/99");
    assert.equal(res.status, 404);
  });
});

describe("reading and leaving entries", () => {
  it("lists only the caller's own entries at /mine", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    await request(app).post("/api/queue/join").set(actingAs("user-b")).send(joinBody());

    const res = await request(app).get("/api/queue/mine").set(actingAs("user-a"));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].userId, "user-a");
  });

  it("returns only the caller's completed and cancelled history", async () => {
    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    await request(app)
      .post("/api/admin/queues/1/serve-next")
      .set(actingAs("staff-1", "staff"));

    const userBEntry = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-b"))
      .send(joinBody());

    await request(app)
      .delete(`/api/queue/${userBEntry.body.id}`)
      .set(actingAs("user-b"));

    const res = await request(app)
      .get("/api/queue/history")
      .set(actingAs("user-a"));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].userId, "user-a");
    assert.equal(res.body[0].status, "served");
  });

  it("requires authentication to access history", async () => {
    const res = await request(app).get("/api/queue/history");

    assert.equal(res.status, 401);
  });

  it("lets the owner read an entry, but not other users", async () => {
    const joined = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());
    const id = joined.body.id as string;

    assert.equal((await request(app).get(`/api/queue/${id}`).set(actingAs("user-a"))).status, 200);
    assert.equal((await request(app).get(`/api/queue/${id}`).set(actingAs("user-b"))).status, 403);
    assert.equal((await request(app).get("/api/queue/missing").set(actingAs("user-a"))).status, 404);
  });

  it("lets the owner leave, and blocks everyone else", async () => {
    const joined = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());
    const id = joined.body.id as string;

    const intruder = await request(app).delete(`/api/queue/${id}`).set(actingAs("user-b"));
    assert.equal(intruder.status, 403);

    const owner = await request(app).delete(`/api/queue/${id}`).set(actingAs("user-a"));
    assert.equal(owner.status, 200);
    assert.equal(owner.body.status, "cancelled");

    const again = await request(app).delete(`/api/queue/${id}`).set(actingAs("user-a"));
    assert.equal(again.status, 409);
  });
});

describe("GET /api/queue/board/:serviceId", () => {
  it("is public and exposes only masked, non-private fields", async () => {
    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody({ fullName: "Alex Johnson", email: "alex@example.com" }));

    const res = await request(app).get("/api/queue/board/1");

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [
      { position: 1, patient: "Ale J.", date: today, timeSlot: "9:00 AM" },
    ]);
  });

  it("returns 404 for an unknown service", async () => {
    assert.equal((await request(app).get("/api/queue/board/99")).status, 404);
  });
});

describe("admin routes", () => {
  it("returns 401 when not logged in and 403 for regular users", async () => {
    assert.equal((await request(app).get("/api/admin/queues")).status, 401);
    assert.equal(
      (await request(app).get("/api/admin/queues").set(actingAs("user-a", "user"))).status,
      403,
    );
  });

  it("lets staff and admins view every service's queue", async () => {
    const staff = await request(app)
      .get("/api/admin/queues")
      .set(actingAs("staff-1", "staff"));
    assert.equal(staff.status, 200);
    assert.equal(staff.body.length, 3);

    const admin = await request(app)
      .get("/api/admin/queues")
      .set(actingAs("admin-1", "admin"));
    assert.equal(admin.status, 200);
  });

  it("shows one service's queue in serving order", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    await request(app).post("/api/queue/join").set(actingAs("user-b")).send(joinBody());

    const res = await request(app)
      .get("/api/admin/queues/1")
      .set(actingAs("staff-1", "staff"));
    assert.equal(res.status, 200);
    assert.equal(res.body.waitingCount, 2);
    assert.deepEqual(
      res.body.waitingList.map((e: { userId: string }) => e.userId),
      ["user-a", "user-b"],
    );
  });

  it("serves the next user and promotes the one behind", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    await request(app).post("/api/queue/join").set(actingAs("user-b")).send(joinBody());

    const res = await request(app)
      .post("/api/admin/queues/1/serve-next")
      .set(actingAs("staff-1", "staff"));
    assert.equal(res.status, 200);
    assert.equal(res.body.served.userId, "user-a");
    assert.equal(res.body.nextUp.userId, "user-b");
    assert.equal(res.body.nextUp.status, "almost_ready");
  });

  it("returns 409 for an empty queue and 404 for an unknown service", async () => {
    const staff = actingAs("staff-1", "staff");
    assert.equal((await request(app).post("/api/admin/queues/1/serve-next").set(staff)).status, 409);
    assert.equal((await request(app).post("/api/admin/queues/99/serve-next").set(staff)).status, 404);
  });
});
