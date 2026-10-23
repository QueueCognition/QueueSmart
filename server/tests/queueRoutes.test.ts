import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";
import { clearQueueStore } from "../src/models/queueStore";
import {
  createAdminQueueRoutes,
  createQueueRoutes,
} from "../src/routes/queueRoutes";
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

const today = new Date().toISOString().slice(0, 10);

type Role = "user" | "staff" | "admin";

function actingAs(id: string, role: Role = "user") {
  return { "x-test-user": JSON.stringify({ id, role }) };
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
  app = buildApp();
});

describe("POST /api/queue/join", () => {
  it("creates an entry owned by the logged-in user", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: "user-a",
      serviceId: "1",
      position: 1,
      status: "almost_ready",
      estimatedWaitMinutes: 15,
    });
  });

  it("returns 401 when not logged in", async () => {
    const res = await request(app).post("/api/queue/join").send(joinBody());
    expect(res.status).toBe(401);
  });

  it("returns 400 with fieldErrors for a bad body", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody({ email: "nope", fullName: "" }));

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.email).toBeDefined();
    expect(res.body.fieldErrors.fullName).toBeDefined();
  });

  it("returns 404 for an unknown service", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody({ serviceId: "99" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the user joins the same service twice", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    const res = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());
    expect(res.status).toBe(409);
  });
});

describe("GET /api/queue/wait-time/:serviceId", () => {
  it("is public and estimates for a new joiner", async () => {
    const empty = await request(app).get("/api/queue/wait-time/1");
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({ waitingCount: 0, estimatedWaitMinutes: 15 });

    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    const busy = await request(app).get("/api/queue/wait-time/1");
    expect(busy.body).toMatchObject({ waitingCount: 1, estimatedWaitMinutes: 30 });
  });

  it("returns 404 for an unknown service", async () => {
    const res = await request(app).get("/api/queue/wait-time/99");
    expect(res.status).toBe(404);
  });
});

describe("reading and leaving entries", () => {
  it("lists only the caller's own entries at /mine", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    await request(app).post("/api/queue/join").set(actingAs("user-b")).send(joinBody());

    const res = await request(app).get("/api/queue/mine").set(actingAs("user-a"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userId).toBe("user-a");
  });

  it("lets the owner read an entry, but not other users", async () => {
    const joined = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());
    const id = joined.body.id as string;

    expect((await request(app).get(`/api/queue/${id}`).set(actingAs("user-a"))).status).toBe(200);
    expect((await request(app).get(`/api/queue/${id}`).set(actingAs("user-b"))).status).toBe(403);
    expect((await request(app).get("/api/queue/missing").set(actingAs("user-a"))).status).toBe(404);
  });

  it("lets the owner leave, and blocks everyone else", async () => {
    const joined = await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody());
    const id = joined.body.id as string;

    const intruder = await request(app).delete(`/api/queue/${id}`).set(actingAs("user-b"));
    expect(intruder.status).toBe(403);

    const owner = await request(app).delete(`/api/queue/${id}`).set(actingAs("user-a"));
    expect(owner.status).toBe(200);
    expect(owner.body.status).toBe("cancelled");

    const again = await request(app).delete(`/api/queue/${id}`).set(actingAs("user-a"));
    expect(again.status).toBe(409);
  });
});

describe("GET /api/queue/board/:serviceId", () => {
  it("is public and exposes only masked, non-private fields", async () => {
    await request(app)
      .post("/api/queue/join")
      .set(actingAs("user-a"))
      .send(joinBody({ fullName: "Alex Johnson", email: "alex@example.com" }));

    const res = await request(app).get("/api/queue/board/1");

    if (res.status !== 200) {
      console.log("DEBUG ERROR BODY:", res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { position: 1, patient: "Ale J.", date: today, timeSlot: "9:00 AM" },
    ]);
  });

  it("returns 404 for an unknown service", async () => {
    expect((await request(app).get("/api/queue/board/99")).status).toBe(404);
  });
});

describe("admin routes", () => {
  it("returns 401 when not logged in and 403 for regular users", async () => {
    expect((await request(app).get("/api/admin/queues")).status).toBe(401);
    expect(
      (await request(app).get("/api/admin/queues").set(actingAs("user-a", "user"))).status,
    ).toBe(403);
  });

  it("lets staff and admins view every service's queue", async () => {
    const staff = await request(app)
      .get("/api/admin/queues")
      .set(actingAs("staff-1", "staff"));
    expect(staff.status).toBe(200);
    expect(staff.body).toHaveLength(3);

    const admin = await request(app)
      .get("/api/admin/queues")
      .set(actingAs("admin-1", "admin"));
    expect(admin.status).toBe(200);
  });

  it("shows one service's queue in serving order", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    await request(app).post("/api/queue/join").set(actingAs("user-b")).send(joinBody());

    const res = await request(app)
      .get("/api/admin/queues/1")
      .set(actingAs("staff-1", "staff"));
    expect(res.status).toBe(200);
    expect(res.body.waitingCount).toBe(2);
    expect(res.body.waitingList.map((e: { userId: string }) => e.userId)).toEqual([
      "user-a",
      "user-b",
    ]);
  });

  it("serves the next user and promotes the one behind", async () => {
    await request(app).post("/api/queue/join").set(actingAs("user-a")).send(joinBody());
    await request(app).post("/api/queue/join").set(actingAs("user-b")).send(joinBody());

    const res = await request(app)
      .post("/api/admin/queues/1/serve-next")
      .set(actingAs("staff-1", "staff"));
    expect(res.status).toBe(200);
    expect(res.body.served.userId).toBe("user-a");
    expect(res.body.nextUp.userId).toBe("user-b");
    expect(res.body.nextUp.status).toBe("almost_ready");
  });

  it("returns 409 for an empty queue and 404 for an unknown service", async () => {
    const staff = actingAs("staff-1", "staff");
    expect((await request(app).post("/api/admin/queues/1/serve-next").set(staff)).status).toBe(409);
    expect((await request(app).post("/api/admin/queues/99/serve-next").set(staff)).status).toBe(404);
  });
});