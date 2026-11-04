import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { config } from "../../src/config/env";
import { errorHandler } from "../../src/middleware/errorHandler";
import { clearNotificationStore } from "../../src/models/notificationStore";
import { clearQueueStore } from "../../src/models/queueStore";
import { insertUser } from "../../src/models/userStore";
import { createNotificationRoutes } from "../../src/routes/notificationRoutes";
import { createAdminQueueRoutes, createQueueRoutes } from "../../src/routes/queueRoutes";
import { createQueueCatalog } from "../../src/services/queueCatalog";
import { QueueService } from "../../src/services/queueService";
import { ServiceService } from "../../src/services/serviceService";
import type { UserRole } from "../../src/types/auth";
import { issueToken } from "../../src/utils/token";

const seededUsers: { id: string; role: UserRole }[] = [
  { id: "user-a", role: "user" },
  { id: "user-b", role: "user" },
  { id: "staff-1", role: "staff" },
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
  const { token } = issueToken(id, role, null, config.jwtSecret, config.tokenTtlSeconds);
  return { authorization: `Bearer ${token}` };
}

function joinBody() {
  return {
    serviceId: "1",
    fullName: "Jamie Win",
    email: "jamie@example.com",
    date: new Date().toISOString().slice(0, 10),
    timeSlot: "9:00 AM",
  };
}

function buildApp() {
  const queueService = new QueueService(createQueueCatalog(new ServiceService()));
  const app = express();

  app.use(express.json());
  app.use("/api/queue", createQueueRoutes(queueService));
  app.use("/api/admin/queues", createAdminQueueRoutes(queueService));
  app.use("/api/notifications", createNotificationRoutes());
  app.use(errorHandler);

  return app;
}

let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  clearQueueStore();
  clearNotificationStore();
  app = buildApp();
});

describe("GET /api/notifications", () => {
  it("returns notifications created when the user joins a queue", async () => {
    const joinRes = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    assert.equal(joinRes.status, 201);

    const res = await request(app)
      .get("/api/notifications")
      .set(actingAs("user-a"));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);

    const notification = res.body[0] as {
      id?: string;
      message: string;
      type: string;
      read: boolean;
      timestamp?: string;
    };
    assert.ok(notification.message.includes("joined the queue"));
    assert.equal(notification.type, "queue_update");
    assert.equal(notification.read, false);
    assert.notEqual(notification.id, undefined);
    assert.notEqual(notification.timestamp, undefined);
  });

  it("returns only the logged-in user's notifications", async () => {
    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-b"))
      .send(joinBody());

    const res = await request(app)
      .get("/api/notifications")
      .set(actingAs("user-a"));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.ok(String(res.body[0].message).includes("joined the queue"));
  });

  it("returns 401 when the caller is not authenticated", async () => {
    const res = await request(app).get("/api/notifications");

    assert.equal(res.status, 401);
  });

  it("notifies the next user when staff serves the person ahead of them", async () => {
    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-b"))
      .send(joinBody());

    const serveRes = await request(app)
      .post("/api/admin/queues/1/serve-next")
      .set(actingAs("staff-1", "staff"));

    assert.equal(serveRes.status, 200);

    const res = await request(app)
      .get("/api/notifications")
      .set(actingAs("user-b"));

    assert.equal(res.status, 200);
    assert.ok(
      res.body.some((notification: { message: string }) =>
        notification.message.includes("next to be served"),
      ),
    );
  });
});
