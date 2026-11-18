import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  formatMonthName,
  formatMonthYear,
  toDateKey,
} from "./dateUtils";

describe("toDateKey", () => {
  it("uses the local calendar date, not UTC", () => {
    // 19:00 local is already the next day in UTC for negative offsets.
    const evening = new Date(2026, 10, 18, 19, 0, 0);

    expect(toDateKey(evening)).toBe("2026-11-18");
  });

  it("keeps a late-night local time on the same day", () => {
    const lateNight = new Date(2026, 11, 31, 23, 59, 59);

    expect(toDateKey(lateNight)).toBe("2026-12-31");
  });

  it("pads single-digit months and days", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("month labels", () => {
  it("formats a full month and year", () => {
    expect(formatMonthYear(new Date(2026, 10, 1))).toBe("November 2026");
  });

  it("formats a bare month name", () => {
    expect(formatMonthName(new Date(2000, 0, 1))).toBe("January");
  });
});

describe("buildMonthGrid", () => {
  it("pads the leading days so the first weekday lands correctly", () => {
    // November 2026 starts on a Sunday, so there is no leading padding.
    const grid = buildMonthGrid(new Date(2026, 10, 1));

    expect(grid[0]).toBe(1);
    expect(grid).toHaveLength(35);
  });

  it("pads a month that starts mid-week", () => {
    // July 2026 starts on a Wednesday, so three blanks precede day 1.
    const grid = buildMonthGrid(new Date(2026, 6, 1));

    expect(grid.slice(0, 4)).toEqual([null, null, null, 1]);
    expect(grid.length % 7).toBe(0);
  });

  it("always produces whole weeks", () => {
    for (let month = 0; month < 12; month += 1) {
      expect(buildMonthGrid(new Date(2026, month, 1)).length % 7).toBe(0);
    }
  });
});
