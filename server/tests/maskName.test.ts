import { describe, expect, it } from "vitest";
import { maskPatientName } from "../src/utils/maskName";

describe("maskPatientName", () => {
  it("keeps 3 letters of the first name and the last initial", () => {
    expect(maskPatientName("Alex Johnson")).toBe("Ale J.");
    expect(maskPatientName("Sarah Lee")).toBe("Sar L.");
  });

  it("uppercases the last initial", () => {
    expect(maskPatientName("jamie win")).toBe("jam W.");
  });

  it("uses the final word as the last name", () => {
    expect(maskPatientName("Mary Jane Watson")).toBe("Mar W.");
  });

  it("handles single names and short first names", () => {
    expect(maskPatientName("Madonna")).toBe("Mad");
    expect(maskPatientName("Al Wu")).toBe("Al W.");
  });

  it("ignores extra whitespace", () => {
    expect(maskPatientName("  Alex   Johnson ")).toBe("Ale J.");
  });

  it("returns an empty string for blank input", () => {
    expect(maskPatientName("   ")).toBe("");
  });
});