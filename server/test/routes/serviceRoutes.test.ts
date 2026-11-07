
import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";
import express from "express";
import request from "supertest";

import { config } from "../../src/config/env";
import { errorHandler } from "../../src/middleware/errorHandler";
import { insertUser } from "../../src/models/userStore";
import { createServiceRoutes } from "../../src/routes/serviceRoutes";
import { ServiceService } from "../../src/services/serviceService";
import type { UserRole } from "../../src/types/auth";
import { issueToken } from "../../src/utils/token";

const users: { id: string; role: UserRole }[] = [
  { id: "service-user", role: "user" },
  { id: "service-staff", role: "staff" },
  { id: "service-admin", role: "admin" },
];

before(() => {
  for (const user of users) {
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

function actingAs(id: string, role: UserRole) {
  const { token } = issueToken(
    id,
    role,
    null,
    config.jwtSecret,
    config.tokenTtlSeconds,
    0
  );

  return { Authorization: `Bearer ${token}` };
}

function serviceBody() {
  return {
    name: "Student ID Card",
    description: "Student identification services",
    duration: 15,
    priority: "medium",
  };
}

function buildApp(database: DatabaseSync) {
  const app = express();
  app.use(express.json());
  app.use("/api/services", createServiceRoutes(new ServiceService(database)));
  app.use(errorHandler);
  return app;
}

let database: DatabaseSync;
let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  if (database) {
    database.close();
  }

  database = new DatabaseSync(":memory:");

  database.exec(`
    CREATE TABLE services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      expected_duration INTEGER NOT NULL CHECK(expected_duration > 0),
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
      is_available INTEGER NOT NULL DEFAULT 1
    )
  `);

  app = buildApp(database);
});

describe("Service Management API", () => {
  it("allows anyone to list services", async () => {
    const response = await request(app).get("/api/services");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
  });

  it("requires authentication to create a service", async () => {
    const response = await request(app)
      .post("/api/services")
      .send(serviceBody());

    assert.equal(response.status, 401);
  });

  it("rejects regular users creating services", async () => {
    const response = await request(app)
      .post("/api/services")
      .set(actingAs("service-user", "user"))
      .send(serviceBody());

    assert.equal(response.status, 403);
  });

  it("allows staff to create a service", async () => {
    const response = await request(app)
      .post("/api/services")
      .set(actingAs("service-staff", "staff"))
      .send(serviceBody());

    assert.equal(response.status, 201);
    assert.equal(response.body.data.name, "Student ID Card");
  });

  it("allows admins to create a service", async () => {
    const response = await request(app)
      .post("/api/services")
      .set(actingAs("service-admin", "admin"))
      .send(serviceBody());

    assert.equal(response.status, 201);
    assert.equal(response.body.data.duration, 15);
  });

  it("rejects invalid service information", async () => {
    const response = await request(app)
      .post("/api/services")
      .set(actingAs("service-admin", "admin"))
      .send({ ...serviceBody(), duration: -5 });

    assert.equal(response.status, 400);
  });

  it("allows admins to update a service", async () => {
    const service = new ServiceService(database).createService(serviceBody());

    const response = await request(app)
      .put(`/api/services/${service.id}`)
      .set(actingAs("service-admin", "admin"))
      .send({ ...serviceBody(), name: "Updated Service" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.name, "Updated Service");
  });

  it("rejects regular users updating services", async () => {
    const service = new ServiceService(database).createService(serviceBody());

    const response = await request(app)
      .put(`/api/services/${service.id}`)
      .set(actingAs("service-user", "user"))
      .send(serviceBody());

    assert.equal(response.status, 403);
  });

  it("returns 404 when updating a missing service", async () => {
    const response = await request(app)
      .put("/api/services/999")
      .set(actingAs("service-admin", "admin"))
      .send(serviceBody());

    assert.equal(response.status, 404);
  });

  it("allows admins to delete a service", async () => {
    const service = new ServiceService(database).createService(serviceBody());

    const response = await request(app)
      .delete(`/api/services/${service.id}`)
      .set(actingAs("service-admin", "admin"));

    assert.equal(response.status, 200);
    assert.deepEqual(new ServiceService(database).listServices(), []);
  });

  it("rejects regular users deleting services", async () => {
    const service = new ServiceService(database).createService(serviceBody());

    const response = await request(app)
      .delete(`/api/services/${service.id}`)
      .set(actingAs("service-user", "user"));

    assert.equal(response.status, 403);
  });

  it("returns 404 when deleting a missing service", async () => {
    const response = await request(app)
      .delete("/api/services/999")
      .set(actingAs("service-admin", "admin"));

    assert.equal(response.status, 404);
  });

  it("rejects invalid service IDs", async () => {
    const response = await request(app)
      .put("/api/services/abc")
      .set(actingAs("service-admin", "admin"))
      .send(serviceBody());

    assert.equal(response.status, 400);
  });
});
