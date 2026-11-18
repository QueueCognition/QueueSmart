import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  joinQueueSchema,
  loginSchema,
  profilePasswordSchema,
  registerSchema,
  serviceSchema,
} from "./schemas";

function messages(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string[] {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe("loginSchema", () => {
  it("requires an email", () => {
    const result = loginSchema.safeParse({
      email: "  ",
      password: "x",
      remember: false,
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toEqual(["Email is required"]);
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({
      email: "nope",
      password: "x",
      remember: false,
    });

    expect(messages(result)).toEqual(["Enter a valid email address"]);
  });

  it("requires a password", () => {
    const result = loginSchema.safeParse({
      email: "ada@example.com",
      password: "",
      remember: false,
    });

    expect(messages(result)).toEqual(["Password is required"]);
  });

  it("accepts trimmed input", () => {
    const result = loginSchema.safeParse({
      email: "  ada@example.com  ",
      password: "secret123",
      remember: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("ada@example.com");
  });
});

describe("registerSchema", () => {
  const valid = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    password: "secret123",
    confirmPassword: "secret123",
  };

  it("accepts a complete registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("requires both names", () => {
    const result = registerSchema.safeParse({
      ...valid,
      firstName: "",
      lastName: "",
    });

    expect(messages(result)).toEqual([
      "First name is required",
      "Last name is required",
    ]);
  });

  it("caps names at fifty characters", () => {
    const result = registerSchema.safeParse({
      ...valid,
      firstName: "a".repeat(51),
    });

    expect(messages(result)).toEqual(["Must be under 50 characters"]);
  });

  it("enforces the minimum password length", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });

    expect(messages(result)).toEqual([
      "Password must be at least 8 characters",
    ]);
  });

  it("requires confirmation to match", () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: "different",
    });

    expect(messages(result)).toEqual(["Passwords do not match"]);
  });

  it("requires confirmation to be present", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "" });

    expect(messages(result)).toEqual(["Please confirm your password"]);
  });

  it("reports a short password instead of the confirmation error", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "",
    });

    expect(messages(result)).toEqual([
      "Password must be at least 8 characters",
      "Please confirm your password",
    ]);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(messages(forgotPasswordSchema.safeParse({ email: "" }))).toEqual([
      "Email is required",
    ]);
    expect(messages(forgotPasswordSchema.safeParse({ email: "bad" }))).toEqual([
      "Enter a valid email address",
    ]);
  });
});

describe("profilePasswordSchema", () => {
  const valid = {
    currentPassword: "oldsecret1",
    newPassword: "newsecret1",
    confirmPassword: "newsecret1",
  };

  it("accepts a proper change", () => {
    expect(profilePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects reusing the current password", () => {
    const result = profilePasswordSchema.safeParse({
      ...valid,
      newPassword: "oldsecret1",
      confirmPassword: "oldsecret1",
    });

    expect(messages(result)).toEqual([
      "New password must be different from your current password",
    ]);
  });

  it("rejects a short new password", () => {
    const result = profilePasswordSchema.safeParse({
      ...valid,
      newPassword: "short",
      confirmPassword: "short",
    });

    expect(messages(result)).toEqual([
      "Password must be at least 8 characters",
    ]);
  });
});

describe("joinQueueSchema", () => {
  const valid = {
    serviceId: "1",
    date: "2026-11-20",
    timeSlot: "9:00 AM",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
  };

  it("accepts a complete request", () => {
    expect(joinQueueSchema.safeParse(valid).success).toBe(true);
  });

  it("reports every missing selection", () => {
    const result = joinQueueSchema.safeParse({
      ...valid,
      serviceId: "",
      date: "",
      timeSlot: "",
    });

    expect(messages(result)).toEqual([
      "Please select a service",
      "Please select a date",
      "Please select a time slot",
    ]);
  });

  it("caps the name at a hundred characters", () => {
    const result = joinQueueSchema.safeParse({
      ...valid,
      fullName: "a".repeat(101),
    });

    expect(messages(result)).toEqual(["Name must be 100 characters or fewer"]);
  });

  it("caps the email at 254 characters", () => {
    const result = joinQueueSchema.safeParse({
      ...valid,
      email: `${"a".repeat(250)}@example.com`,
    });

    expect(messages(result)).toEqual(["Email must be 254 characters or fewer"]);
  });
});

describe("serviceSchema", () => {
  const valid = {
    name: "Dentist",
    description: "Checkup",
    duration: "30",
    priority: "medium",
  };

  it("accepts a complete service", () => {
    expect(serviceSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name and description", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      name: "",
      description: "",
    });

    expect(messages(result)).toEqual([
      "Service name is required.",
      "Description is required.",
    ]);
  });

  it("caps the name at a hundred characters", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      name: "a".repeat(101),
    });

    expect(messages(result)).toEqual([
      "Service name must be 100 characters or less.",
    ]);
  });

  it("requires a positive whole duration", () => {
    expect(
      messages(serviceSchema.safeParse({ ...valid, duration: "1.5" })),
    ).toEqual(["Duration must be a positive whole number."]);
    expect(
      messages(serviceSchema.safeParse({ ...valid, duration: "0" })),
    ).toEqual(["Duration must be a positive whole number."]);
    expect(
      messages(serviceSchema.safeParse({ ...valid, duration: "abc" })),
    ).toEqual(["Duration must be a positive whole number."]);
  });

  it("requires a duration before checking its value", () => {
    expect(
      messages(serviceSchema.safeParse({ ...valid, duration: "  " })),
    ).toEqual(["Expected duration is required."]);
  });
});
