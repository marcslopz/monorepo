import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mergePatches, toApiPatch, pendingCount, withoutConsolidated } from "../lib.js";

const base = { op: "edit", lineId: "l0002", text: "x", author: "Lorea", deviceId: "d1", createdAt: "2026-11-21T10:00:00.000Z" };
const p = (id, fields = {}) => ({ id, ...base, ...fields });

describe("mergePatches(local, remote)", () => {
  test("union by id: remote ones plus local ones the server doesn't have yet", () => {
    const merged = mergePatches([p("a", { pending: true })], [p("b")]);
    assert.deepEqual(merged.map((x) => x.id).sort(), ["a", "b"]);
    assert.equal(merged.find((x) => x.id === "a").pending, true);
  });

  test("a pending patch the server already has is no longer pending", () => {
    const [merged] = mergePatches([p("a", { pending: true })], [p("a")]);
    assert.equal(merged.pending, undefined);
  });

  test("undone on either side wins; a local undo not on the server stays pendingUndo", () => {
    const [remoteUndone] = mergePatches([p("a")], [p("a", { undone: true })]);
    assert.equal(remoteUndone.undone, true);
    const [localUndone] = mergePatches([p("a", { undone: true, pendingUndo: true })], [p("a")]);
    assert.deepEqual([localUndone.undone, localUndone.pendingUndo], [true, true]);
    const [both] = mergePatches([p("a", { undone: true, pendingUndo: true })], [p("a", { undone: true })]);
    assert.equal(both.pendingUndo, undefined);
  });

  test("a local patch that was already sent but is gone from the server is dropped", () => {
    // e.g. the table was emptied after consolidating into the JSON (step 10)
    assert.deepEqual(mergePatches([p("a")], []), []);
  });

  test("the server's `play` field is not kept (patches are stored per play already)", () => {
    const [merged] = mergePatches([], [p("a", { play: "la-cita" })]);
    assert.equal(merged.play, undefined);
  });
});

describe("toApiPatch", () => {
  test("adds the play and drops the local-only flags and undone", () => {
    const sent = toApiPatch(p("a", { pending: true, pendingUndo: true, undone: true }), "la-cita");
    assert.deepEqual(sent, { ...p("a"), play: "la-cita" });
  });
});

describe("pendingCount", () => {
  test("counts patches or undos still to send", () => {
    assert.equal(pendingCount([p("a", { pending: true }), p("b", { pendingUndo: true }), p("c")]), 2);
  });
});

describe("withoutConsolidated", () => {
  test("drops patches already folded into the play (ids in its revisions)", () => {
    const play = { revisions: [{ date: "x", patches: ["a"] }] };
    assert.deepEqual(withoutConsolidated([p("a"), p("b")], play).map((x) => x.id), ["b"]);
    assert.deepEqual(withoutConsolidated([p("a")], {}).map((x) => x.id), ["a"]);
  });
});
