import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskPatientName } from "../../src/utils/maskName";

describe("maskPatientName", () => {
  it("keeps 3 letters of the first name and the last initial", () => {
    assert.equal(maskPatientName("Alex Johnson"), "Ale J.");
    assert.equal(maskPatientName("Sarah Lee"), "Sar L.");
  });

  it("uppercases the last initial", () => {
    assert.equal(maskPatientName("jamie win"), "jam W.");
  });

  it("uses the final word as the last name", () => {
    assert.equal(maskPatientName("Mary Jane Watson"), "Mar W.");
  });

  it("handles single names and short first names", () => {
    assert.equal(maskPatientName("Madonna"), "Mad");
    assert.equal(maskPatientName("Al Wu"), "Al W.");
  });

  it("ignores extra whitespace", () => {
    assert.equal(maskPatientName("  Alex   Johnson "), "Ale J.");
  });

  it("returns an empty string for blank input", () => {
    assert.equal(maskPatientName("   "), "");
  });
});
