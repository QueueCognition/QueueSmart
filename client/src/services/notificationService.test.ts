import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as notificationService from "../services/notificationService";
import { emptyResponse, jsonResponse, mockFetch } from "../test/fetchMock";

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
    expect(calls[0].headers.get("Authorization")).toBe("Bearer notif-token");
  });

  it("marks a single notification as read", async () => {
    const calls = mockFetch(() =>
      jsonResponse({ ...NOTIFICATION, read: true }),
    );

    const updated = await notificationService.markNotificationAsRead("n1");

    expect(updated.read).toBe(true);
    expect(calls[0].url).toMatch(/\/notifications\/n1\/read$/);
    expect(calls[0].method).toBe("PATCH");
  });

  it("resolves mark-all against a 204 response", async () => {
    mockFetch(() => emptyResponse());

    await expect(
      notificationService.markAllNotificationsAsRead(),
    ).resolves.toBeUndefined();
  });

  it("throws a descriptive error on failure", async () => {
    mockFetch(() => jsonResponse({ message: "boom" }, 500));

    await expect(notificationService.getNotifications()).rejects.toThrow();
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
