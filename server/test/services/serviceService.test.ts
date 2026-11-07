import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { ServiceService } from "../../src/services/serviceService";
import { validateServiceInput } from "../../src/validators/serviceValidator";

function createTestDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");

  database.exec(`
    CREATE TABLE services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      expected_duration INTEGER NOT NULL CHECK (expected_duration > 0),
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
      is_available INTEGER NOT NULL DEFAULT 1
    );
  `);

  return database;
}

const validService = {
  name: "Passport Services",
  description: "Passport application assistance.",
  duration: 25,
  priority: "high",
};

describe("Service Management", () => {
  it("starts with an empty database", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      assert.deepEqual(serviceService.listServices(), []);
    } finally {
      database.close();
    }
  });

  it("creates and lists a valid service", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      const service = serviceService.createService(validService);

      assert.equal(service.id, 1);
      assert.equal(service.name, "Passport Services");
      assert.equal(service.priority, "high");
      assert.equal(serviceService.listServices().length, 1);
    } finally {
      database.close();
    }
  });

  it("stores service information in SQLite", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      serviceService.createService(validService);

      const row = database
        .prepare("SELECT * FROM services WHERE id = ?")
        .get("1");

      assert.equal(row?.name, "Passport Services");
      assert.equal(row?.expected_duration, 25);
      assert.equal(row?.is_available, 1);
    } finally {
      database.close();
    }
  });

  it("keeps services across ServiceService instances", () => {
    const database = createTestDatabase();
    try {
      const firstInstance = new ServiceService(database);
      firstInstance.createService(validService);

      const secondInstance = new ServiceService(database);
      assert.equal(secondInstance.listServices().length, 1);
      assert.equal(secondInstance.listServices()[0]?.name, "Passport Services");
    } finally {
      database.close();
    }
  });

  it("updates an existing service", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      const created = serviceService.createService(validService);

      const updated = serviceService.updateService(created.id, {
        name: "Updated Passport Service",
        description: "Updated description.",
        duration: 30,
        priority: "medium",
      });

      assert.equal(updated?.name, "Updated Passport Service");
      assert.equal(serviceService.listServices()[0]?.duration, 30);
    } finally {
      database.close();
    }
  });

  it("returns undefined when updating a nonexistent service", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);

      assert.equal(serviceService.updateService(999, validService), undefined);
    } finally {
      database.close();
    }
  });

  it("removes an existing service", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      const created = serviceService.createService(validService);

      assert.equal(serviceService.removeService(created.id), true);
      assert.equal(serviceService.listServices().length, 0);
    } finally {
      database.close();
    }
  });

  it("returns false when removing a nonexistent service", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);

      assert.equal(serviceService.removeService(999), false);
    } finally {
      database.close();
    }
  });

  it("creates services as available", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      const created = serviceService.createService(validService);

      assert.equal(created.isAvailable, true);
      assert.equal(serviceService.listServices()[0]?.isAvailable, true);
    } finally {
      database.close();
    }
  });

  it("toggles availability and reads it back", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      const created = serviceService.createService(validService);

      const paused = serviceService.setAvailability(created.id, false);

      assert.equal(paused?.isAvailable, false);
      assert.equal(serviceService.listServices()[0]?.isAvailable, false);

      const resumed = serviceService.setAvailability(created.id, true);

      assert.equal(resumed?.isAvailable, true);
      assert.equal(serviceService.listServices()[0]?.isAvailable, true);
    } finally {
      database.close();
    }
  });

  it("returns undefined when toggling a nonexistent service", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);

      assert.equal(serviceService.setAvailability(999, false), undefined);
    } finally {
      database.close();
    }
  });

  it("keeps availability when other fields are updated", () => {
    const database = createTestDatabase();
    try {
      const serviceService = new ServiceService(database);
      const created = serviceService.createService(validService);
      serviceService.setAvailability(created.id, false);

      const updated = serviceService.updateService(created.id, {
        name: "Renamed Service",
        description: "Renamed description.",
        duration: 40,
        priority: "low",
      });

      assert.equal(updated?.name, "Renamed Service");
      assert.equal(updated?.isAvailable, false);
    } finally {
      database.close();
    }
  });

  it("rejects a blank service name", () => {
    const result = validateServiceInput({
      ...validService,
      name: " ",
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("Service name is required."));
  });

  it("rejects a service name longer than 100 characters", () => {
    const result = validateServiceInput({
      ...validService,
      name: "A".repeat(101),
    });

    assert.equal(result.valid, false);
    assert.ok(
      result.errors.includes("Service name must be 100 characters or less."),
    );
  });

  it("rejects a non-positive duration", () => {
    const result = validateServiceInput({
      ...validService,
      duration: -5,
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("Duration must be a positive number."));
  });

  it("rejects a fractional duration", () => {
    const result = validateServiceInput({
      ...validService,
      duration: 12.5,
    });

    assert.equal(result.valid, false);
  });

  it("rejects an invalid priority", () => {
    const result = validateServiceInput({
      ...validService,
      priority: "urgent",
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("Priority must be low, medium, or high."));
  });
});
