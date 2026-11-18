import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../../src/app";

describe("api prefix", () => {
  it("mounts every router under the configured prefix", async () => {
    const app = createApp({ apiPrefix: "/v1" });

    const services = await request(app).get("/v1/services");
    assert.equal(services.status, 200);

    const queue = await request(app).get("/v1/queue/board/1");
    assert.equal(queue.body.message, "Service not found");

    const notifications = await request(app).get("/v1/notifications");
    assert.equal(notifications.status, 401);

    const adminQueues = await request(app).get("/v1/admin/queues");
    assert.equal(adminQueues.status, 401);
  });

  it("does not leave any router on the default prefix", async () => {
    const app = createApp({ apiPrefix: "/v1" });

    const services = await request(app).get("/api/services");
    assert.equal(services.status, 404);
    assert.equal(services.body.message, "Route not found");
  });

  it("keeps the health endpoint outside the api prefix", async () => {
    const app = createApp({ apiPrefix: "/v1" });

    const health = await request(app).get("/health");
    assert.equal(health.status, 200);
    assert.deepEqual(health.body, { status: "ok" });
  });
});
