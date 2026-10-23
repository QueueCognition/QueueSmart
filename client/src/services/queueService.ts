import type {
  QueueEntry,
  QueueServiceSummary,
  PublicQueueRow,
  Service,
  WaitEstimate,
} from "../types/queue";
import { getStoredAccessToken } from "./authService";
import { getServices as getManagedServices } from "./serviceApi";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api"
).replace(/\/$/, "");
const QUEUE_URL = `${API_BASE_URL}/queue`;
const ADMIN_QUEUE_URL = `${API_BASE_URL}/admin/queues`;

export interface JoinQueueInput {
  serviceId: string;
  fullName: string;
  email: string;
  date: string;
  timeSlot: string;
}

interface ApiErrorPayload {
  message?: unknown;
  fieldErrors?: Record<string, unknown>;
}

async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  const token = getStoredAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error("Unable to reach the server. Please try again.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid response."
        : `The request failed with status ${response.status}.`,
    );
  }

  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null
        ? (payload as ApiErrorPayload)
        : {};
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message
        : `The request failed with status ${response.status}.`;
    const details = Object.entries(error.fieldErrors ?? {})
      .filter(([, value]) => typeof value === "string")
      .map(([field, value]) => `${field}: ${value}`)
      .join(" ");
    throw new Error(details ? `${message} ${details}` : message);
  }

  return payload as T;
}

export async function getServices(): Promise<Service[]> {
  const services = await getManagedServices();
  return services.map((service) => ({
    id: String(service.id),
    name: service.name,
    description: service.description,
    expectedDuration: service.duration,
    priority: service.priority,
    isAvailable: true,
  }));
}

export function joinQueue(input: JoinQueueInput): Promise<QueueEntry> {
  return request<QueueEntry>(QUEUE_URL, "/join", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getQueueStatus(entryId: string): Promise<QueueEntry> {
  return request<QueueEntry>(
    QUEUE_URL,
    `/${encodeURIComponent(entryId)}`,
  );
}

export function getMyQueue(): Promise<QueueEntry[]> {
  return request<QueueEntry[]>(QUEUE_URL, "/mine");
}

export function leaveQueue(entryId: string): Promise<QueueEntry> {
  return request<QueueEntry>(
    QUEUE_URL,
    `/${encodeURIComponent(entryId)}`,
    { method: "DELETE" },
  );
}

export function getWaitEstimate(serviceId: string): Promise<WaitEstimate> {
  return request<WaitEstimate>(
    QUEUE_URL,
    `/wait-time/${encodeURIComponent(serviceId)}`,
  );
}

export function getPublicQueueBoard(
  serviceId: string,
): Promise<PublicQueueRow[]> {
  return request<PublicQueueRow[]>(
    QUEUE_URL,
    `/board/${encodeURIComponent(serviceId)}`,
  );
}

export function getAdminServiceWaitSummaries(): Promise<QueueServiceSummary[]> {
  return request<QueueServiceSummary[]>(ADMIN_QUEUE_URL, "");
}

export function serveNext(serviceId: string): Promise<{
  served: QueueEntry;
  nextUp: QueueEntry | null;
}> {
  return request(
    ADMIN_QUEUE_URL,
    `/${encodeURIComponent(serviceId)}/serve-next`,
    { method: "POST" },
  );
}
