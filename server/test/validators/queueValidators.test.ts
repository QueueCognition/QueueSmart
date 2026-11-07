import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError, type FieldErrors } from "../../src/utils/errors";
import { validateJoinQueueInput } from "../../src/validators/queueValidators";

const today = new Date().toISOString().slice(0, 10);

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: "s1",
    fullName: "Jamie Win",
    email: "jamie@example.com",
    date: today,
    timeSlot: "9:00 AM",
    ...overrides,
  };
}

function fieldErrorsFor(body: unknown): FieldErrors | undefined {
  try {
    validateJoinQueueInput(body);
  } catch (err) {
    if (err instanceof ValidationError) return err.fieldErrors;
    throw err;
  }
  return undefined;
}

describe("validateJoinQueueInput", () => {
  it("accepts a valid body and maps form fields to customer fields", () => {
    assert.deepEqual(validateJoinQueueInput(validBody()), {
      serviceId: "s1",
      customerName: "Jamie Win",
      customerEmail: "jamie@example.com",
      date: today,
      timeSlot: "9:00 AM",
    });
  });

  it("trims surrounding whitespace", () => {
    const result = validateJoinQueueInput(
      validBody({ fullName: "  Jamie Win  " }),
    );
    assert.equal(result.customerName, "Jamie Win");
  });

  it("reports every invalid field at once", () => {
    const errors = fieldErrorsFor(
      validBody({
        serviceId: "",
        fullName: "   ",
        email: "not-an-email",
        date: "",
        timeSlot: "3:33 AM",
      }),
    );
    assert.deepEqual(
      Object.keys(errors ?? {}).sort(),
      ["date", "email", "fullName", "serviceId", "timeSlot"].sort(),
    );
  });

  it("rejects names over 100 characters", () => {
    assert.notEqual(
      fieldErrorsFor(validBody({ fullName: "a".repeat(101) }))?.fullName,
      undefined,
    );
  });

  it("rejects impossible dates like Feb 30", () => {
    assert.notEqual(
      fieldErrorsFor(validBody({ date: "2099-02-30" }))?.date,
      undefined,
    );
  });

  it("rejects dates in the past", () => {
    assert.notEqual(
      fieldErrorsFor(validBody({ date: "2020-01-01" }))?.date,
      undefined,
    );
  });

  it("rejects bodies that are not objects", () => {
    assert.throws(() => validateJoinQueueInput(null), ValidationError);
    assert.throws(() => validateJoinQueueInput("hello"), ValidationError);
  });

  it("rejects fields that are not text", () => {
    const errors = fieldErrorsFor(
      validBody({
        serviceId: 5,
        fullName: 123,
        email: ["a@b.com"],
        date: {},
        timeSlot: true,
      }),
    );
    assert.deepEqual(
      Object.keys(errors ?? {}).sort(),
      ["date", "email", "fullName", "serviceId", "timeSlot"].sort(),
    );
    assert.equal(errors?.fullName, "Must be text");
  });

  it("treats null and missing fields as required", () => {
    const errors = fieldErrorsFor({ serviceId: null, fullName: "Jamie Win" });
    assert.equal(errors?.serviceId, "Please select a service");
    assert.equal(errors?.email, "Email is required");
  });

  it("rejects emails over 254 characters", () => {
    const tooLong = `${"a".repeat(250)}@x.com`;
    assert.notEqual(
      fieldErrorsFor(validBody({ email: tooLong }))?.email,
      undefined,
    );
  });

  it("rejects over-long service ids", () => {
    assert.notEqual(
      fieldErrorsFor(validBody({ serviceId: "s".repeat(65) }))?.serviceId,
      undefined,
    );
  });
});
