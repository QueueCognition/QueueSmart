import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "../services/authError";
import * as queueService from "../services/queueService";

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

const ENTRY = {
  id: "e1",
  serviceId: "1",
  position: 2,
  estimatedWaitMinutes: 15,
  status: "waiting",
  joinedAt: "2026-11-18T12:00:00.000Z",
};

describe("queueService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      "queuesmart.auth.session",
      JSON.stringify({ token: "queue-token" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts a join request and attaches the stored token", async () => {
    const calls = mockFetch(() => jsonResponse(ENTRY, 201));

    const entry = await queueService.joinQueue({
      serviceId: "1",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      date: "2026-11-20",
      timeSlot: "9:00 AM",
    });

    expect(entry.position).toBe(2);
    expect(calls[0].url).toMatch(/\/queue\/join$/);
    expect(calls[0].init.method).toBe("POST");
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBe(
      "Bearer queue-token",
    );
  });

  it("encodes ids in queue paths", async () => {
    const calls = mockFetch(() => jsonResponse(ENTRY));

    await queueService.getQueueStatus("a/b c");

    expect(calls[0].url).toMatch(/\/queue\/a%2Fb%20c$/);
  });

  it("maps message and field errors onto AuthError", async () => {
    mockFetch(() =>
      jsonResponse(
        {
          message: "Invalid request data",
          fieldErrors: { timeSlot: "Pick a slot" },
        },
        400,
      ),
    );

    const error = await queueService
      .joinQueue({
        serviceId: "1",
        fullName: "Ada",
        email: "ada@example.com",
        date: "2026-11-20",
        timeSlot: "9:00 AM",
      })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(400);
    expect((error as AuthError).message).toBe(
      "Invalid request data timeSlot: Pick a slot",
    );
    expect((error as AuthError).fieldErrors).toEqual({
      timeSlot: "Pick a slot",
    });
  });

  it("truncates non-204 bodies through the admin queue endpoint", async () => {
    const calls = mockFetch(() =>
      jsonResponse([{ service: {}, waitingCount: 0, waitingList: [] }]),
    );

    await queueService.getAdminServiceWaitSummaries();

    expect(calls[0].url).toMatch(/\/admin\/queues$/);
  });
});
