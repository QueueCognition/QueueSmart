import { describe, expect, it } from "vitest";
import { estimateWaitForNewJoiner, estimateWaitMinutes } from "../src/utils/waitTime";

const service = { expectedDuration: 15 };

describe("estimateWaitMinutes", () => {
  it("multiplies position by expected duration", () => {
    expect(estimateWaitMinutes(1, service)).toBe(15);
    expect(estimateWaitMinutes(3, service)).toBe(45);
  });

  it("rejects positions below 1", () => {
    expect(() => estimateWaitMinutes(0, service)).toThrow(RangeError);
    expect(() => estimateWaitMinutes(-2, service)).toThrow(RangeError);
  });

  it("rejects non-integer positions", () => {
    expect(() => estimateWaitMinutes(1.5, service)).toThrow(RangeError);
  });
});

describe("estimateWaitForNewJoiner", () => {
  it("is one duration for an empty queue", () => {
    expect(estimateWaitForNewJoiner(0, service)).toBe(15);
  });

  it("adds one slot for the new person behind the existing queue", () => {
    expect(estimateWaitForNewJoiner(4, service)).toBe(75);
  });
});