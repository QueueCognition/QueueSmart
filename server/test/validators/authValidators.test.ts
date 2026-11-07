import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "../../src/utils/errors";
import {
  validateLogin,
  validatePasswordChange,
  validatePasswordReset,
  validateProfileUpdate,
  validateRegister,
} from "../../src/validators/authValidators";

function fieldErrors(action: () => unknown): Record<string, string> {
  try {
    action();
  } catch (error) {
    assert.ok(error instanceof ValidationError);
    return error.fieldErrors ?? {};
  }

  assert.fail("expected a ValidationError");
}

describe("validateLogin", () => {
  it("trims the email and keeps the password", () => {
    assert.deepEqual(
      validateLogin({
        email: "  demo@queuesmart.dev ",
        password: "password123",
      }),
      { email: "demo@queuesmart.dev", password: "password123" },
    );
  });

  it("reports missing credentials", () => {
    assert.deepEqual(
      fieldErrors(() => validateLogin({})),
      {
        email: "Email is required",
        password: "Password is required",
      },
    );
  });

  it("reports an invalid email format", () => {
    assert.deepEqual(
      fieldErrors(() => validateLogin({ email: "nope", password: "x" })),
      {
        email: "Enter a valid email address",
      },
    );
  });

  it("treats non-object bodies as empty", () => {
    assert.deepEqual(
      fieldErrors(() => validateLogin(null)),
      {
        email: "Email is required",
        password: "Password is required",
      },
    );
  });
});

describe("validateRegister", () => {
  it("trims names and email", () => {
    assert.deepEqual(
      validateRegister({
        firstName: " Demo ",
        lastName: " User ",
        email: " demo@queuesmart.dev ",
        password: "password123",
      }),
      {
        firstName: "Demo",
        lastName: "User",
        email: "demo@queuesmart.dev",
        password: "password123",
      },
    );
  });

  it("reports every missing field", () => {
    assert.deepEqual(
      fieldErrors(() => validateRegister({})),
      {
        firstName: "First name is required",
        lastName: "Last name is required",
        email: "Email is required",
        password: "Password is required",
      },
    );
  });

  it("reports overlong names", () => {
    const longName = "a".repeat(51);
    const errors = fieldErrors(() =>
      validateRegister({
        firstName: longName,
        lastName: longName,
        email: "demo@queuesmart.dev",
        password: "password123",
      }),
    );

    assert.equal(errors.firstName, "Must be under 50 characters");
    assert.equal(errors.lastName, "Must be under 50 characters");
  });

  it("requires at least 8 password characters", () => {
    const errors = fieldErrors(() =>
      validateRegister({
        firstName: "Demo",
        lastName: "User",
        email: "demo@queuesmart.dev",
        password: "1234567",
      }),
    );

    assert.equal(errors.password, "Password must be at least 8 characters");
  });
});

describe("validatePasswordReset", () => {
  it("accepts and trims a valid email", () => {
    assert.deepEqual(
      validatePasswordReset({ email: " demo@queuesmart.dev " }),
      {
        email: "demo@queuesmart.dev",
      },
    );
  });

  it("rejects an invalid email", () => {
    assert.deepEqual(
      fieldErrors(() => validatePasswordReset({ email: "nope" })),
      {
        email: "Enter a valid email address",
      },
    );
  });
});

describe("validateProfileUpdate", () => {
  it("returns only the provided fields and trims them", () => {
    assert.deepEqual(validateProfileUpdate({ firstName: "  Demo  " }), {
      firstName: "Demo",
    });
    assert.deepEqual(
      validateProfileUpdate({ firstName: " Demo ", lastName: " User " }),
      { firstName: "Demo", lastName: "User" },
    );
  });

  it("rejects an empty name", () => {
    assert.deepEqual(
      fieldErrors(() => validateProfileUpdate({ firstName: "" })),
      {
        firstName: "First name is required",
      },
    );
  });

  it("rejects an overlong name", () => {
    assert.deepEqual(
      fieldErrors(() => validateProfileUpdate({ lastName: "a".repeat(51) })),
      { lastName: "Must be under 50 characters" },
    );
  });

  it("requires at least one editable field", () => {
    for (const body of [{}, { email: "demo@queuesmart.dev" }, null]) {
      assert.throws(
        () => validateProfileUpdate(body),
        (error: unknown) =>
          error instanceof ValidationError &&
          error.message === "No profile changes were provided",
      );
    }
  });
});

describe("validatePasswordChange", () => {
  it("accepts a valid password change", () => {
    assert.deepEqual(
      validatePasswordChange({
        currentPassword: "password123",
        newPassword: "new-password456",
      }),
      { currentPassword: "password123", newPassword: "new-password456" },
    );
  });

  it("reports both missing passwords", () => {
    assert.deepEqual(
      fieldErrors(() => validatePasswordChange({})),
      {
        currentPassword: "Current password is required",
        newPassword: "Password is required",
      },
    );
  });

  it("requires at least 8 characters for the new password", () => {
    assert.deepEqual(
      fieldErrors(() =>
        validatePasswordChange({
          currentPassword: "password123",
          newPassword: "1234567",
        }),
      ),
      { newPassword: "Password must be at least 8 characters" },
    );
  });

  it("rejects reusing the current password", () => {
    assert.deepEqual(
      fieldErrors(() =>
        validatePasswordChange({
          currentPassword: "password123",
          newPassword: "password123",
        }),
      ),
      {
        newPassword:
          "New password must be different from your current password",
      },
    );
  });
});
