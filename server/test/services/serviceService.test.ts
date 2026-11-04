import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ServiceService } from "../../src/services/serviceService";
import { validateServiceInput } from "../../src/validators/serviceValidator";

describe("Service Management", () => {
  it("lists the initial services", () => {
    const serviceService = new ServiceService();

    assert.equal(serviceService.listServices().length, 3);
  });

  it("creates a valid service", () => {
    const serviceService = new ServiceService();

    const service = serviceService.createService({
      name: "Passport Services",
      description: "Passport application assistance.",
      duration: 25,
      priority: "high",
    });

    assert.equal(service.id, 4);
    assert.equal(service.name, "Passport Services");
    assert.equal(service.priority, "high");
  });

  it("rejects a blank service name", () => {
    const result = validateServiceInput({
      name: " ",
      description: "Valid description",
      duration: 20,
      priority: "medium",
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("Service name is required."));
  });

  it("rejects a service name longer than 100 characters", () => {
    const result = validateServiceInput({
      name: "A".repeat(101),
      description: "Valid description",
      duration: 20,
      priority: "medium",
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("Service name must be 100 characters or less."));
  });

  it("rejects a non-positive duration", () => {
    const result = validateServiceInput({
      name: "Passport Services",
      description: "Valid description",
      duration: -5,
      priority: "medium",
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("Duration must be a positive number."));
  });

  it("rejects an invalid priority", () => {
    const result = validateServiceInput({
      name: "Passport Services",
      description: "Valid description",
      duration: 20,
      priority: "urgent",
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("Priority must be low, medium, or high."));
  });

  it("updates an existing service", () => {
    const serviceService = new ServiceService();

    const updated = serviceService.updateService(1, {
      name: "Updated Student ID",
      description: "Updated ID card service.",
      duration: 10,
      priority: "low",
    });

    assert.equal(updated?.name, "Updated Student ID");
    assert.equal(serviceService.listServices()[0]?.duration, 10);
  });

  it("returns undefined when updating a nonexistent service", () => {
    const serviceService = new ServiceService();

    assert.equal(
      serviceService.updateService(999, {
        name: "Unknown",
        description: "Unknown service",
        duration: 10,
        priority: "low",
      }),
      undefined,
    );
  });

  it("removes an existing service", () => {
    const serviceService = new ServiceService();

    const removed = serviceService.removeService(1);

    assert.equal(removed, true);
    assert.equal(serviceService.listServices().length, 2);
    assert.equal(
      serviceService.listServices().some((service) => service.id === 1),
      false,
    );
  });

  it("returns false when removing a nonexistent service", () => {
    const serviceService = new ServiceService();

    assert.equal(serviceService.removeService(999), false);
    assert.equal(serviceService.listServices().length, 3);
  });
});
