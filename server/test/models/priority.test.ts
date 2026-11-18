import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRIORITIES, isPriority } from "../../src/models/service";

describe("priority vocabulary", () => {
  it("accepts every declared priority", () => {
    for (const priority of PRIORITIES) {
      assert.equal(isPriority(priority), true);
    }
  });

  it("rejects values outside the declared set", () => {
    for (const value of ["urgent", "LOW", "", null, undefined, 1, {}]) {
      assert.equal(isPriority(value), false);
    }
  });

  it("keeps the declared order from low to high", () => {
    assert.deepEqual([...PRIORITIES], ["low", "medium", "high"]);
  });
});
