import { describe, expect, it } from "vitest";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local-calendar date key, as used by Calendar.tsx. */
function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

/** Current implementation in Dashboard.tsx, which is UTC-based. */
function utcDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

describe("today's date key", () => {
  it("differs between local and UTC keys for a late-evening local time", () => {
    // 2026-11-18 19:00 in a UTC-6 zone is 2026-11-19T01:00:00Z.
    const evening = new Date(2026, 10, 18, 19, 0, 0);

    expect(localDateKey(evening)).toBe("2026-11-18");
    expect(utcDateKey(evening)).toBe("2026-11-19");
  });
});
