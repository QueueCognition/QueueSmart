import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskPatientName } from "../../src/utils/maskName";

describe("maskPatientName", () => {
  it("keeps 3 letters of the first name and the last initial", () => {
    assert.equal(maskPatientName("Alex Johnson"), "Ale J.");
    assert.equal(maskPatientName("Sarah Lee"), "Sar L.");
  });

  it("capitalizes an all-lowercase first name and the last initial", () => {
    assert.equal(maskPatientName("jamie win"), "Jam W.");
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
    assert.equal(maskPatientName(""), "");
  });

  it("produces the same mask for all-lowercase and all-uppercase input", () => {
    const variants = [
      "Alex Johnson",
      "alex johnson",
      "ALEX JOHNSON",
      "Alex johnson",
      "ALEX johnson",
      "Alex JOHNSON",
    ];

    for (const variant of variants) {
      assert.equal(maskPatientName(variant), "Ale J.");
    }
  });

  it("preserves the casing of names written deliberately in mixed case", () => {
    assert.equal(maskPatientName("McDonald Harris"), "McD H.");
    assert.equal(maskPatientName("DeSantis Mario"), "DeS M.");
  });

  it("keeps apostrophes visible in both cases", () => {
    assert.equal(maskPatientName("O'Brien Patrick"), "O'B P.");
    assert.equal(maskPatientName("O'BRIEN PATRICK"), "O'B P.");
  });

  it("handles short and single-character first names", () => {
    assert.equal(maskPatientName("Jo Wu"), "Jo W.");
    assert.equal(maskPatientName("J Wu"), "J W.");
    assert.equal(maskPatientName("X Smith"), "X S.");
    assert.equal(maskPatientName("A"), "A");
  });

  it("does not leak more than three letters of the first name", () => {
    assert.equal(maskPatientName("Bartholomew Clark"), "Bar C.");
    assert.equal(maskPatientName("Alexandra Montgomery"), "Ale M.");
  });

  it("keeps hyphens inside the visible prefix", () => {
    assert.equal(maskPatientName("Mary-Jane Watson"), "Mar W.");
  });
});
