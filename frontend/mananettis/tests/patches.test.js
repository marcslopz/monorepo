import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { applyPatches } from "../lib.js";

const lines = [
  { id: "l0001", t: "ESCENA 1", scene: true },
  { id: "l0002", s: "MARÍA", t: "Hola." },
  { id: "l0003", s: "JESÚS", t: "Adiós." },
  { id: "l0004", t: "Se va.", acot: true },
];

let n = 0;
const patch = (fields) => ({ id: `p${++n}`, createdAt: `2026-11-21T10:00:0${n}Z`, ...fields });
const ids = (result) => result.map((l) => l.id);

describe("applyPatches", () => {
  test("without patches returns the same lines, as copies", () => {
    const result = applyPatches(lines, []);
    assert.deepEqual(result, lines);
    result[1].t = "changed";
    assert.equal(lines[1].t, "Hola.");
  });

  test("edit replaces the text and marks the line", () => {
    const p = patch({ op: "edit", lineId: "l0002", text: "Hola, Jesús." });
    const result = applyPatches(lines, [p]);
    assert.equal(result[1].t, "Hola, Jesús.");
    assert.deepEqual(result[1].patches, [p.id]);
    assert.equal(result[2].patches, undefined);
    assert.equal(lines[1].t, "Hola.");
  });

  test("delete removes the line", () => {
    const result = applyPatches(lines, [patch({ op: "delete", lineId: "l0003" })]);
    assert.deepEqual(ids(result), ["l0001", "l0002", "l0004"]);
  });

  test("reassign changes the speaker", () => {
    const p = patch({ op: "reassign", lineId: "l0003", speaker: "ADÁN" });
    const result = applyPatches(lines, [p]);
    assert.equal(result[2].s, "ADÁN");
    assert.deepEqual(result[2].patches, [p.id]);
  });

  test("reassigning a stage direction turns it into a spoken line", () => {
    const result = applyPatches(lines, [patch({ op: "reassign", lineId: "l0004", speaker: "MARÍA" })]);
    assert.equal(result[3].s, "MARÍA");
    assert.equal(result[3].acot, undefined);
  });

  test("insert adds a spoken line after afterId, with the patch's lineId", () => {
    const p = patch({ op: "insert", lineId: "n-1", afterId: "l0002", speaker: "ADÁN", text: "¡Eh!" });
    const result = applyPatches(lines, [p]);
    assert.deepEqual(ids(result), ["l0001", "l0002", "n-1", "l0003", "l0004"]);
    assert.deepEqual(result[2], { id: "n-1", s: "ADÁN", t: "¡Eh!", inserted: true, patches: [p.id] });
  });

  test("insert without speaker adds a stage direction", () => {
    const p = patch({ op: "insert", lineId: "n-2", afterId: "l0003", text: "Llaman a la puerta." });
    const result = applyPatches(lines, [p]);
    assert.deepEqual(result[3], { id: "n-2", t: "Llaman a la puerta.", acot: true, inserted: true, patches: [p.id] });
  });

  test("insert with afterId null goes at the beginning", () => {
    const result = applyPatches(lines, [patch({ op: "insert", lineId: "n-3", afterId: null, text: "Prólogo." })]);
    assert.equal(result[0].id, "n-3");
  });

  test("an inserted line can be patched later", () => {
    const result = applyPatches(lines, [
      patch({ op: "insert", lineId: "n-4", afterId: "l0002", speaker: "ADÁN", text: "Eh" }),
      patch({ op: "edit", lineId: "n-4", text: "¡Eh!" }),
    ]);
    assert.equal(result[2].t, "¡Eh!");
    assert.equal(result[2].patches.length, 2);
  });

  test("undone patches are ignored", () => {
    const result = applyPatches(lines, [patch({ op: "delete", lineId: "l0002", undone: true })]);
    assert.deepEqual(ids(result), ids(lines));
  });

  test("patches apply in createdAt order, not array order", () => {
    const later = { id: "a", op: "edit", lineId: "l0002", text: "segunda", createdAt: "2026-11-21T12:00:00Z" };
    const earlier = { id: "b", op: "edit", lineId: "l0002", text: "primera", createdAt: "2026-11-21T11:00:00Z" };
    assert.equal(applyPatches(lines, [later, earlier])[1].t, "segunda");
  });

  test("patches to missing lines or with unknown ops are ignored", () => {
    const result = applyPatches(lines, [
      patch({ op: "edit", lineId: "nope", text: "x" }),
      patch({ op: "delete", lineId: "nope" }),
      patch({ op: "insert", lineId: "n-5", afterId: "nope", text: "x" }),
      patch({ op: "explode", lineId: "l0002" }),
    ]);
    assert.deepEqual(result, lines);
  });

  test("editing a line after it was deleted is ignored", () => {
    const result = applyPatches(lines, [
      patch({ op: "delete", lineId: "l0002" }),
      patch({ op: "edit", lineId: "l0002", text: "x" }),
    ]);
    assert.deepEqual(ids(result), ["l0001", "l0003", "l0004"]);
  });

  test("inserting with an id that already exists is ignored", () => {
    const result = applyPatches(lines, [patch({ op: "insert", lineId: "l0003", afterId: "l0001", text: "x" })]);
    assert.deepEqual(result, lines);
  });
});
