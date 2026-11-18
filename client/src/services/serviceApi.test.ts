import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as serviceApi from "../services/serviceApi";
import { jsonResponse, mockFetch } from "../test/fetchMock";

const SERVICE = {
  id: 3,
  name: "Dentist",
  description: "Checkup",
  duration: 30,
  priority: "medium",
  isAvailable: true,
};

describe("serviceApi", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("unwraps the { success, data } envelope", async () => {
    mockFetch(() => jsonResponse({ success: true, data: [SERVICE] }));

    const services = await serviceApi.getServices();

    expect(services).toEqual([SERVICE]);
  });

  it("throws when a 200 response reports success: false", async () => {
    mockFetch(() =>
      jsonResponse({ success: false, errors: ["Nope", "Also nope"] }),
    );

    await expect(serviceApi.getServices()).rejects.toThrow("Nope Also nope");
  });

  it("throws a joined message on a non-ok status", async () => {
    mockFetch(() => jsonResponse({ success: false, errors: ["Bad id"] }, 400));

    await expect(serviceApi.deleteService(9)).rejects.toThrow("Bad id");
  });

  it("sends availability patches to the nested route", async () => {
    const calls = mockFetch(() =>
      jsonResponse({ success: true, data: { ...SERVICE, isAvailable: false } }),
    );

    await serviceApi.setServiceAvailability(3, false);

    expect(calls[0].url).toMatch(/\/services\/3\/availability$/);
    expect(calls[0].method).toBe("PATCH");
    expect(JSON.parse(calls[0].body)).toEqual({ isAvailable: false });
  });
});
