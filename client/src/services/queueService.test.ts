import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "../services/authError";
import { describeApiError } from "../services/apiClient";
import * as queueService from "../services/queueService";
import { jsonResponse, mockFetch } from "../test/fetchMock";

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
    const calls = mockFetch(() => jsonResponse(ENTRY));

    const entry = await queueService.joinQueue({
      serviceId: "1",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      date: "2026-11-20",
      timeSlot: "9:00 AM",
    });

    expect(entry.position).toBe(2);
    expect(calls[0].url).toMatch(/\/queue\/join$/);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers.get("Authorization")).toBe("Bearer queue-token");
  });

  it("encodes ids in queue paths", async () => {
    const calls = mockFetch(() => jsonResponse({ estimatedWaitMinutes: 5 }));

    await queueService.getWaitEstimate("a/b c");

    expect(calls[0].url).toMatch(/\/queue\/wait-time\/a%2Fb%20c$/);
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
    expect((error as AuthError).message).toBe("Invalid request data");
    expect((error as AuthError).fieldErrors).toEqual({
      timeSlot: "Pick a slot",
    });
    expect(describeApiError(error, "failed")).toBe(
      "Invalid request data timeSlot: Pick a slot",
    );
  });

  it("reads the admin queue endpoint", async () => {
    const calls = mockFetch(() =>
      jsonResponse([{ service: {}, waitingCount: 0, waitingList: [] }]),
    );

    await queueService.getAdminServiceWaitSummaries();

    expect(calls[0].url).toMatch(/\/admin\/queues$/);
  });

  it("maps the service envelope into queue services", async () => {
    mockFetch(() =>
      jsonResponse({
        success: true,
        data: [
          {
            id: 7,
            name: "Dentist",
            description: "Checkup",
            duration: 30,
            priority: "high",
            isAvailable: true,
          },
        ],
      }),
    );

    const services = await queueService.getServices();

    expect(services).toEqual([
      {
        id: "7",
        name: "Dentist",
        description: "Checkup",
        expectedDuration: 30,
        priority: "high",
        isAvailable: true,
      },
    ]);
  });
});
