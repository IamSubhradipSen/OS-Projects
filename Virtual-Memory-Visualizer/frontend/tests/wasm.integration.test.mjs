
import assert from "node:assert/strict";
import { test } from "node:test";
import createPagingEngine from "./wasm/pagingEngine.node.js";

const pages = [
  7, 0, 1, 2, 0, 3, 0, 4, 2, 3,
  0, 3, 2, 1, 2, 0, 1, 7, 0, 1,
];

let engine;

test("Initialize the real WebAssembly module", async () => {
  engine = await createPagingEngine();
  assert.equal(typeof engine.simulateForWeb, "function");
});

test("FIFO matches expected results", () => {
  const result = engine.simulateForWeb(0, pages, 3);

  assert.equal(result.pageFaults, 15);
  assert.equal(result.pageHits, 5);
  assert.ok(Math.abs(result.faultRate - 75) < 0.001);
  assert.equal(result.steps.length, pages.length);
});

test("LRU matches expected results", () => {
  const result = engine.simulateForWeb(1, pages, 3);

  assert.equal(result.pageFaults, 12);
  assert.equal(result.pageHits, 8);
  assert.ok(Math.abs(result.faultRate - 60) < 0.001);
  assert.equal(result.steps.length, pages.length);
});

test("OPT matches expected results", () => {
  const result = engine.simulateForWeb(2, pages, 3);

  assert.equal(result.pageFaults, 9);
  assert.equal(result.pageHits, 11);
  assert.ok(Math.abs(result.faultRate - 45) < 0.001);
  assert.equal(result.steps.length, pages.length);
});

test("Every step has a valid frame state", () => {
  for (const algorithm of [0, 1, 2]) {
    const result = engine.simulateForWeb(algorithm, pages, 3);

    for (const step of result.steps) {
      assert.equal(typeof step.page, "number");
      assert.equal(typeof step.hit, "boolean");
      assert.ok(Array.isArray(step.frames));
      assert.equal(step.frames.length, 3);
      assert.ok(
        step.frames.every(
          (page) => page === null || Number.isInteger(page)
        )
      );
    }
  }
});

test("Empty reference string produces no faults or hits", () => {
  for (const algorithm of [0, 1, 2]) {
    const result = engine.simulateForWeb(algorithm, [], 3);

    assert.equal(result.pageFaults, 0);
    assert.equal(result.pageHits, 0);
    assert.equal(result.faultRate, 0);
    assert.equal(result.steps.length, 0);
  }
});

test("Repeated pages produce one fault and three hits", () => {
  for (const algorithm of [0, 1, 2]) {
    const result = engine.simulateForWeb(algorithm, [4, 4, 4, 4], 2);

    assert.equal(result.pageFaults, 1);
    assert.equal(result.pageHits, 3);
    assert.ok(Math.abs(result.faultRate - 25) < 0.001);
  }
});

test("Rejects zero frames", () => {
  assert.throws(() => engine.simulateForWeb(0, [1, 2, 3], 0));
});

test("Rejects negative page numbers", () => {
  assert.throws(() => engine.simulateForWeb(0, [1, -2, 3], 3));
});

test("Rejects negative frame counts", () => {
  assert.throws(() => engine.simulateForWeb(0, [1, 2], -1));
});
