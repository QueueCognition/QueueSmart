import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timeAgo } from "../utils/timeUtils";

const NOW = new Date("2026-11-18T12:00:00.000Z");

function isoSecondsAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' under a minute", () => {
    expect(timeAgo(isoSecondsAgo(0))).toBe("Just now");
    expect(timeAgo(isoSecondsAgo(59))).toBe("Just now");
  });

  it("returns minutes under an hour", () => {
    expect(timeAgo(isoSecondsAgo(60))).toBe("1 min ago");
    expect(timeAgo(isoSecondsAgo(59 * 60))).toBe("59 min ago");
  });

  it("returns hours under a day", () => {
    expect(timeAgo(isoSecondsAgo(60 * 60))).toBe("1 hr ago");
    expect(timeAgo(isoSecondsAgo(23 * 60 * 60))).toBe("23 hr ago");
  });

  it("singularizes one day", () => {
    expect(timeAgo(isoSecondsAgo(24 * 60 * 60))).toBe("1 day ago");
  });

  it("pluralizes multiple days", () => {
    expect(timeAgo(isoSecondsAgo(3 * 24 * 60 * 60))).toBe("3 days ago");
  });
});
