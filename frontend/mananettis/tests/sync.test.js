import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mergePatches, toApiPatch, pendingCount, withoutConsolidated, markUndo, markRedo } from "../lib.js";

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

  test("the server decides undone, unless a local undo/redo is still pending", () => {
    const [remoteUndone] = mergePatches([p("a")], [p("a", { undone: true })]);
    assert.equal(remoteUndone.undone, true);
    const [localUndone] = mergePatches([p("a", { undone: true, pendingUndo: true })], [p("a")]);
    assert.deepEqual([localUndone.undone, localUndone.pendingUndo], [true, true]);
    const [both] = mergePatches([p("a", { undone: true, pendingUndo: true })], [p("a", { undone: true })]);
    assert.equal(both.pendingUndo, undefined);
    // someone redid it elsewhere: an old (already sent) local undo must not come back
    const [redoneElsewhere] = mergePatches([p("a", { undone: true })], [p("a")]);
    assert.deepEqual([redoneElsewhere.undone, redoneElsewhere.pendingUndo], [undefined, undefined]);
    // redone here, not sent yet
    const [localRedo] = mergePatches([p("a", { pendingRedo: true })], [p("a", { undone: true })]);
    assert.deepEqual([localRedo.undone, localRedo.pendingRedo], [undefined, true]);
    const [redoArrived] = mergePatches([p("a", { pendingRedo: true })], [p("a")]);
    assert.equal(redoArrived.pendingRedo, undefined);
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
    const sent = toApiPatch(p("a", { pending: true, pendingUndo: true, pendingRedo: true, undone: true }), "la-cita");
    assert.deepEqual(sent, { ...p("a"), play: "la-cita" });
  });
});

describe("pendingCount", () => {
  test("counts patches or undos still to send", () => {
    assert.equal(pendingCount([p("a", { pending: true }), p("b", { pendingUndo: true }), p("c", { pendingRedo: true }), p("d")]), 3);
  });
});

describe("withoutConsolidated", () => {
  test("drops patches already folded into the play (ids in its revisions)", () => {
    const play = { revisions: [{ date: "x", patches: ["a"] }] };
    assert.deepEqual(withoutConsolidated([p("a"), p("b")], play).map((x) => x.id), ["b"]);
    assert.deepEqual(withoutConsolidated([p("a")], {}).map((x) => x.id), ["a"]);
  });
});

describe("markUndo / markRedo", () => {
  const one = (list) => list[0];
  test("undo marks undone + pendingUndo; redo clears undone + pendingRedo", () => {
    const undone = markUndo([p("a")], "a");
    assert.deepEqual([one(undone).undone, one(undone).pendingUndo], [true, true]);
    const sentUndo = [p("a", { undone: true })]; // undo already on the server
    const redone = markRedo(sentUndo, "a");
    assert.deepEqual([one(redone).undone, one(redone).pendingRedo], [undefined, true]);
  });

  test("undo then redo before sending cancels out (nothing to send), and the other way round", () => {
    const back = markRedo(markUndo([p("a")], "a"), "a");
    assert.deepEqual(one(back), p("a"));
    const again = markUndo(markRedo([p("a", { undone: true })], "a"), "a");
    assert.deepEqual(one(again), p("a", { undone: true }));
  });

  test("no-ops: undo an undone one, redo an active one; other patches untouched", () => {
    assert.deepEqual(markUndo([p("a", { undone: true }), p("b")], "a"), [p("a", { undone: true }), p("b")]);
    assert.deepEqual(markRedo([p("a")], "a"), [p("a")]);
  });
});
