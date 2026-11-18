import ky, { HTTPError, type Options } from "ky";
import { ApiError, AuthError, NETWORK_ERROR_MESSAGE } from "./apiError";
import { getAccessToken } from "./session";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api"
).replace(/\/$/, "");

/**
 * ky resolves `baseUrl` through `new Request(baseUrl)`, which rejects a
 * relative path outside a browser document. Resolve it against the current
 * origin once so both the browser and test environments agree.
 */
function absoluteBaseUrl(path: string): string {
  const withSlash = `${path.replace(/\/$/, "")}/`;
  return new URL(withSlash, window.location.origin).toString();
}

function readFieldErrors(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};

  const fieldErrors: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") fieldErrors[key] = entry;
  }

  return fieldErrors;
}

function joinedErrors(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .join(" ");
}

function payloadMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;

    const errors = joinedErrors(record.errors);
    if (errors) return errors;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
  }

  return `The request failed with status ${status}.`;
}

function toApiError(cause: unknown): ApiError {
  if (cause instanceof HTTPError) {
    const payload = cause.data;
    return new AuthError(
      payloadMessage(payload, cause.response.status),
      cause.response.status,
      typeof payload === "object" && payload !== null
        ? readFieldErrors((payload as Record<string, unknown>).fieldErrors)
        : {},
    );
  }

  return new AuthError(NETWORK_ERROR_MESSAGE, 0);
}

const api = ky.create({
  baseUrl: absoluteBaseUrl(API_BASE_URL),
  retry: { limit: 2, methods: ["get", "head"] },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = getAccessToken();
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
  },
});

/**
 * Issues a request against the API and returns the parsed body.
 * `path` must be relative (no leading slash) so it resolves under `baseUrl`.
 */
export async function apiRequest<T>(
  path: string,
  options: Options = {},
): Promise<T> {
  try {
    const response = await api(path, options);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (cause) {
    throw toApiError(cause);
  }
}

export const apiGet = <T>(path: string, options: Options = {}) =>
  apiRequest<T>(path, { ...options, method: "get" });

export const apiPost = <T>(path: string, options: Options = {}) =>
  apiRequest<T>(path, { ...options, method: "post" });

export const apiPatch = <T>(path: string, options: Options = {}) =>
  apiRequest<T>(path, { ...options, method: "patch" });

export const apiPut = <T>(path: string, options: Options = {}) =>
  apiRequest<T>(path, { ...options, method: "put" });

export const apiDelete = <T>(path: string, options: Options = {}) =>
  apiRequest<T>(path, { ...options, method: "delete" });

/**
 * Renders an error for display, appending field-level details. Plain errors
 * fall back to their own message, matching the previous queue behavior.
 */
export function describeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const details = Object.entries(error.fieldErrors)
      .map(([field, value]) => `${field}: ${value}`)
      .join(" ");

    return details ? `${error.message} ${details}` : error.message;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
