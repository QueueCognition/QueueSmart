import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";
import { clearQueueStore } from "../src/models/queueStore";
import { clearNotificationStore } from "../src/models/notificationStore";
import { createNotificationRoutes } from "../src/routes/notificationRoutes";
import { createAdminQueueRoutes,createQueueRoutes } from "../src/routes/queueRoutes";
import { createQueueCatalog } from "../src/services/queueCatalog";
import { QueueService } from "../src/services/queueService";
import { ServiceService } from "../src/services/serviceService";

vi.mock("../src/middleware/requireAuth", async () => {
  const { AuthError } = await import("../src/utils/errors.js");

  return {
    requireAuth: (req: Request, res: Response, next: NextFunction) => {
      const header = req.header("x-test-user");

      if (!header) {
        next(new AuthError("Authentication required", 401));
        return;
      }

      res.locals.user = JSON.parse(header);
      next();
    },
  };
});

type Role = "user" | "staff" | "admin";

function actingAs(id: string, role: Role = "user") {
  return { "x-test-user": JSON.stringify({ id, role }) };
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
  const serviceService = new ServiceService();
  const queueService = new QueueService(
    createQueueCatalog(serviceService),
  );
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

    expect(joinRes.status).toBe(201);

    const res = await request(app)
      .get("/api/notifications")
      .set(actingAs("user-a"));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      message: expect.stringContaining("joined the queue"),
      type: "queue_update",
      read: false,
    });
    expect(res.body[0].id).toBeDefined();
    expect(res.body[0].timestamp).toBeDefined();
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

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].message).toContain("joined the queue");
  });

  it("returns 401 when the caller is not authenticated", async () => {
    const res = await request(app).get("/api/notifications");

    expect(res.status).toBe(401);
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

  expect(serveRes.status).toBe(200);

  const res = await request(app)
      .get("/api/notifications")
      .set(actingAs("user-b"));

  expect(res.status).toBe(200);
  expect(
      res.body.some(
      (notification: { message: string }) =>
          notification.message.includes("next to be served"),
      ),
  ).toBe(true);
  });
});