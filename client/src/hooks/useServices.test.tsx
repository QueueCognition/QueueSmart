import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useServices } from "./useServices";
import { mockFetch, jsonResponse } from "../test/fetchMock";
import { queryKeys } from "../lib/queryClient";

const SERVICE_ROW = {
  id: 1,
  name: "Dentist",
  description: "Checkup",
  duration: 30,
  priority: "medium",
  isAvailable: true,
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("service list query", () => {
  let calls: { url: string }[];

  beforeEach(() => {
    calls = mockFetch(() =>
      jsonResponse({ success: true, data: [SERVICE_ROW] }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the service list once no matter how many components ask", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const first = renderHook(() => useServices(), { wrapper: wrapper(client) });
    const second = renderHook(() => useServices(), {
      wrapper: wrapper(client),
    });
    const third = renderHook(() => useServices(), { wrapper: wrapper(client) });

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(third.result.current.isSuccess).toBe(true));

    const serviceCalls = calls.filter((call) => /\/services$/.test(call.url));

    expect(serviceCalls).toHaveLength(1);
    expect(first.result.current.data).toHaveLength(1);
  });

  it("maps the server shape onto the client Service type", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useServices(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toEqual({
      id: "1",
      name: "Dentist",
      description: "Checkup",
      expectedDuration: 30,
      priority: "medium",
      isAvailable: true,
    });
  });

  it("shares the cached result across consumers", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const first = renderHook(() => useServices(), { wrapper: wrapper(client) });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    const cached = client.getQueryData(queryKeys.services);
    expect(cached).toHaveLength(1);

    const second = renderHook(() => useServices(), {
      wrapper: wrapper(client),
    });
    expect(second.result.current.data).toEqual(cached);
  });
});
