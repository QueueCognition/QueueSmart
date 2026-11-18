import { z } from "zod";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const NAME_MAX = 50;

/** Reports the first failing check only, so users see one message per field. */
function requiredThenMax(required: string, max: number, tooLong: string) {
  return (value: string, ctx: z.RefinementCtx) => {
    if (!value) {
      ctx.addIssue({ code: "custom", message: required });
    } else if (value.length > max) {
      ctx.addIssue({ code: "custom", message: tooLong });
    }
  };
}

export const emailField = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (!value) ctx.addIssue({ code: "custom", message: "Email is required" });
    else if (!EMAIL_PATTERN.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid email address",
      });
    }
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: "custom", message: "Password is required" });
    }
  }),
  remember: z.boolean(),
});

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .superRefine(
        requiredThenMax(
          "First name is required",
          NAME_MAX,
          "Must be under 50 characters",
        ),
      ),
    lastName: z
      .string()
      .trim()
      .superRefine(
        requiredThenMax(
          "Last name is required",
          NAME_MAX,
          "Must be under 50 characters",
        ),
      ),
    email: emailField,
    password: z.string().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: "custom", message: "Password is required" });
      } else if (value.length < 8) {
        ctx.addIssue({
          code: "custom",
          message: "Password must be at least 8 characters",
        });
      }
    }),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Please confirm your password",
        path: ["confirmPassword"],
      });
    } else if (values.confirmPassword !== values.password) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const profileDetailsSchema = z.object({
  firstName: z
    .string()
    .trim()
    .superRefine(
      requiredThenMax(
        "First name is required",
        NAME_MAX,
        "Must be under 50 characters",
      ),
    ),
  lastName: z
    .string()
    .trim()
    .superRefine(
      requiredThenMax(
        "Last name is required",
        NAME_MAX,
        "Must be under 50 characters",
      ),
    ),
});

export const profilePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.currentPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Current password is required",
        path: ["currentPassword"],
      });
    }

    if (!values.newPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Password is required",
        path: ["newPassword"],
      });
    } else if (values.newPassword.length < 8) {
      ctx.addIssue({
        code: "custom",
        message: "Password must be at least 8 characters",
        path: ["newPassword"],
      });
    } else if (
      values.currentPassword &&
      values.newPassword === values.currentPassword
    ) {
      ctx.addIssue({
        code: "custom",
        message: "New password must be different from your current password",
        path: ["newPassword"],
      });
    }

    if (!values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Please confirm your password",
        path: ["confirmPassword"],
      });
    } else if (values.confirmPassword !== values.newPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const joinQueueSchema = z
  .object({
    serviceId: z.string(),
    date: z.string(),
    timeSlot: z.string(),
    fullName: z.string().trim(),
    email: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (!values.serviceId) {
      ctx.addIssue({
        code: "custom",
        message: "Please select a service",
        path: ["serviceId"],
      });
    }
    if (!values.date) {
      ctx.addIssue({
        code: "custom",
        message: "Please select a date",
        path: ["date"],
      });
    }
    if (!values.timeSlot) {
      ctx.addIssue({
        code: "custom",
        message: "Please select a time slot",
        path: ["timeSlot"],
      });
    }

    if (!values.fullName) {
      ctx.addIssue({
        code: "custom",
        message: "Full name is required",
        path: ["fullName"],
      });
    } else if (values.fullName.length > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Name must be 100 characters or fewer",
        path: ["fullName"],
      });
    }

    if (!values.email) {
      ctx.addIssue({
        code: "custom",
        message: "Email is required",
        path: ["email"],
      });
    } else if (!EMAIL_PATTERN.test(values.email)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid email address",
        path: ["email"],
      });
    } else if (values.email.length > 254) {
      ctx.addIssue({
        code: "custom",
        message: "Email must be 254 characters or fewer",
        path: ["email"],
      });
    }
  });

export const serviceSchema = z
  .object({
    name: z.string().trim(),
    description: z.string().trim(),
    duration: z.string().trim(),
    priority: z.enum(["low", "medium", "high"]),
  })
  .superRefine((values, ctx) => {
    if (!values.name) {
      ctx.addIssue({
        code: "custom",
        message: "Service name is required.",
        path: ["name"],
      });
    } else if (values.name.length > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Service name must be 100 characters or less.",
        path: ["name"],
      });
    }

    if (!values.description) {
      ctx.addIssue({
        code: "custom",
        message: "Description is required.",
        path: ["description"],
      });
    }

    if (!values.duration) {
      ctx.addIssue({
        code: "custom",
        message: "Expected duration is required.",
        path: ["duration"],
      });
    } else if (
      !Number.isSafeInteger(Number(values.duration)) ||
      Number(values.duration) <= 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Duration must be a positive whole number.",
        path: ["duration"],
      });
    }
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;
export type ProfilePasswordValues = z.infer<typeof profilePasswordSchema>;
export type JoinQueueValues = z.infer<typeof joinQueueSchema>;
export type ServiceValues = z.infer<typeof serviceSchema>;
