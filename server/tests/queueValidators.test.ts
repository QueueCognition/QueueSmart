import { describe, expect, it } from "vitest";
import { ValidationError, type FieldErrors } from "../src/utils/errors";
import { validateJoinQueueInput } from "../src/validators/queueValidators";

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
    expect(validateJoinQueueInput(validBody())).toEqual({
      serviceId: "s1",
      customerName: "Jamie Win",
      customerEmail: "jamie@example.com",
      date: today,
      timeSlot: "9:00 AM",
    });
  });

  it("trims surrounding whitespace", () => {
    const result = validateJoinQueueInput(validBody({ fullName: "  Jamie Win  " }));
    expect(result.customerName).toBe("Jamie Win");
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
    expect(Object.keys(errors ?? {}).sort()).toEqual(
      ["date", "email", "fullName", "serviceId", "timeSlot"].sort(),
    );
  });

  it("rejects names over 100 characters", () => {
    expect(fieldErrorsFor(validBody({ fullName: "a".repeat(101) }))?.fullName).toBeDefined();
  });

  it("rejects impossible dates like Feb 30", () => {
    expect(fieldErrorsFor(validBody({ date: "2099-02-30" }))?.date).toBeDefined();
  });

  it("rejects dates in the past", () => {
    expect(fieldErrorsFor(validBody({ date: "2020-01-01" }))?.date).toBeDefined();
  });

  it("rejects bodies that are not objects", () => {
    expect(() => validateJoinQueueInput(null)).toThrow(ValidationError);
    expect(() => validateJoinQueueInput("hello")).toThrow(ValidationError);
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
    expect(Object.keys(errors ?? {}).sort()).toEqual(
      ["date", "email", "fullName", "serviceId", "timeSlot"].sort(),
    );
    expect(errors?.fullName).toBe("Must be text");
  });

  it("treats null and missing fields as required", () => {
    const errors = fieldErrorsFor({ serviceId: null, fullName: "Jamie Win" });
    expect(errors?.serviceId).toBe("Please select a service");
    expect(errors?.email).toBe("Email is required");
  });

  it("rejects emails over 254 characters", () => {
    const tooLong = `${"a".repeat(250)}@x.com`;
    expect(fieldErrorsFor(validBody({ email: tooLong }))?.email).toBeDefined();
  });

  it("rejects over-long service ids", () => {
    expect(fieldErrorsFor(validBody({ serviceId: "s".repeat(65) }))?.serviceId).toBeDefined();
  });
});