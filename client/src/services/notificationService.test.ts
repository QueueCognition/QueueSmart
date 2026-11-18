import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as notificationService from "../services/notificationService";

type Call = { url: string; init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (call: Call) => Response) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = { url: String(input), init: init ?? {} };
      calls.push(call);
      return handler(call);
    }),
  );
  return calls;
}

const NOTIFICATION = {
  id: "n1",
  message: "You are almost up",
  type: "queue_update",
  timestamp: "2026-11-18T12:00:00.000Z",
  read: false,
};

describe("notificationService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists notifications with a bearer token", async () => {
    localStorage.setItem(
      "queuesmart.auth.session",
      JSON.stringify({ token: "notif-token" }),
    );

    const calls = mockFetch(() => jsonResponse([NOTIFICATION]));

    const list = await notificationService.getNotifications();

    expect(list).toEqual([NOTIFICATION]);
    expect(calls[0].url).toMatch(/\/notifications$/);
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBe(
      "Bearer notif-token",
    );
  });

  it("marks a single notification as read", async () => {
    const calls = mockFetch(() =>
      jsonResponse({ ...NOTIFICATION, read: true }),
    );

    const updated = await notificationService.markNotificationAsRead("n1");

    expect(updated.read).toBe(true);
    expect(calls[0].url).toMatch(/\/notifications\/n1\/read$/);
    expect(calls[0].init.method).toBe("PATCH");
  });

  it("resolves mark-all against a 204 response", async () => {
    mockFetch(() => new Response(null, { status: 204 }));

    await expect(
      notificationService.markAllNotificationsAsRead(),
    ).resolves.toBeUndefined();
  });

  it("throws a descriptive error on failure", async () => {
    mockFetch(() => jsonResponse({ message: "boom" }, 500));

    await expect(notificationService.getNotifications()).rejects.toThrow(
      "Failed to load notifications (status 500).",
    );
  });

  it("throws when the server is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );

    await expect(notificationService.getNotifications()).rejects.toThrow(
      "Unable to reach the server. Please try again.",
    );
  });
});
