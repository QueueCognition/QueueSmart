import { vi } from "vitest";

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string;
}

async function toRecordedRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<RecordedRequest> {
  if (typeof Request !== "undefined" && input instanceof Request) {
    return {
      url: input.url,
      method: input.method,
      headers: input.headers,
      body: await input.clone().text(),
    };
  }

  return {
    url: String(input),
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers),
    body: typeof init?.body === "string" ? init.body : "",
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}

/**
 * Installs a fetch stub and records every request in a `fetch`-agnostic shape,
 * because ky passes a `Request` object while plain `fetch` callers may pass
 * `(url, init)`.
 */
export function mockFetch(
  handler: (request: RecordedRequest) => Response,
): RecordedRequest[] {
  const calls: RecordedRequest[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = await toRecordedRequest(input, init);
      calls.push(request);
      return handler(request);
    }),
  );

  return calls;
}
