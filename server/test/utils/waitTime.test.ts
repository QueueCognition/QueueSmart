import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateWaitForNewJoiner,
  estimateWaitMinutes,
} from "../../src/utils/waitTime";

const service = { expectedDuration: 15 };

describe("estimateWaitMinutes", () => {
  it("multiplies position by expected duration", () => {
    assert.equal(estimateWaitMinutes(1, service), 15);
    assert.equal(estimateWaitMinutes(3, service), 45);
  });

  it("rejects positions below 1", () => {
    assert.throws(() => estimateWaitMinutes(0, service), RangeError);
    assert.throws(() => estimateWaitMinutes(-2, service), RangeError);
  });

  it("rejects non-integer positions", () => {
    assert.throws(() => estimateWaitMinutes(1.5, service), RangeError);
  });
});

describe("estimateWaitForNewJoiner", () => {
  it("is one duration for an empty queue", () => {
    assert.equal(estimateWaitForNewJoiner(0, service), 15);
  });

  it("adds one slot for the new person behind the existing queue", () => {
    assert.equal(estimateWaitForNewJoiner(4, service), 75);
  });
});
