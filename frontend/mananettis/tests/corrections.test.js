import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { newPatch, patchesFromEdit, undoPatch, activePatches, describePatch, applyPatches } from "../lib.js";

const ctx = { author: "Lorea", deviceId: "dev-1", now: "2026-11-21T10:00:00.000Z", uuid: () => "u1" };
const lines = [
  { id: "l0001", t: "ESCENA 1", scene: true },
  { id: "l0002", s: "MARÍA", t: "Hola." },
  { id: "l0003", t: "Se va.", acot: true },
];

describe("newPatch", () => {
  test("stamps id, author, device and date", () => {
    assert.deepEqual(newPatch({ op: "delete", lineId: "l0002" }, ctx), {
      id: "u1", op: "delete", lineId: "l0002", author: "Lorea", deviceId: "dev-1", createdAt: ctx.now,
    });
  });

  test("insert gets a fresh line id (n-<uuid>) and keeps afterId, null included", () => {
    const p = newPatch({ op: "insert", afterId: null, speaker: "ADÁN", text: "¡Eh!" }, ctx);
    assert.equal(p.lineId, "n-u1");
    assert.equal(p.afterId, null);
    assert.equal(p.speaker, "ADÁN");
  });
});

describe("patchesFromEdit", () => {
  test("nothing changed → no patches", () => {
    assert.deepEqual(patchesFromEdit(lines[1], { speaker: "MARÍA", text: " Hola. " }, ctx), []);
  });

  test("text changed → edit (trimmed)", () => {
    const [p] = patchesFromEdit(lines[1], { speaker: "MARÍA", text: "Hola, Jesús. " }, ctx);
    assert.equal(p.op, "edit");
    assert.equal(p.text, "Hola, Jesús.");
  });

  test("speaker changed → reassign; both changed → both", () => {
    const ops = patchesFromEdit(lines[1], { speaker: "ADÁN", text: "Otra." }, ctx).map((p) => p.op);
    assert.deepEqual(ops, ["edit", "reassign"]);
  });

  test("the speaker comparison ignores accents and case", () => {
    assert.deepEqual(patchesFromEdit(lines[1], { speaker: "maria", text: "Hola." }, ctx), []);
  });

  test("stage direction without speaker only edits the text; empty text does nothing", () => {
    assert.deepEqual(patchesFromEdit(lines[2], { speaker: "", text: "Se marcha." }, ctx).map((p) => p.op), ["edit"]);
    assert.deepEqual(patchesFromEdit(lines[1], { speaker: "MARÍA", text: "  " }, ctx), []);
  });

  test("two patches from one edit get different ids", () => {
    let i = 0;
    const ps = patchesFromEdit(lines[1], { speaker: "ADÁN", text: "Otra." }, { ...ctx, uuid: () => `u${++i}` });
    assert.notEqual(ps[0].id, ps[1].id);
  });
});

describe("undoPatch / activePatches", () => {
  const patches = [newPatch({ op: "delete", lineId: "l0002" }, ctx)];

  test("undo marks it undone without mutating the list", () => {
    const undone = undoPatch(patches, "u1");
    assert.equal(undone[0].undone, true);
    assert.equal(patches[0].undone, undefined);
    assert.deepEqual(activePatches(undone), []);
    assert.deepEqual(applyPatches(lines, undone).map((l) => l.id), ["l0001", "l0002", "l0003"]);
  });
});

describe("describePatch", () => {
  const p = (fields) => newPatch(fields, ctx);
  test("each op in words, quoting the original line", () => {
    assert.equal(describePatch(p({ op: "edit", lineId: "l0002", text: "Hola, Jesús." }), lines), "Texto de MARÍA «Hola.» → «Hola, Jesús.»");
    assert.equal(describePatch(p({ op: "delete", lineId: "l0002" }), lines), "Borrada: MARÍA «Hola.»");
    assert.equal(describePatch(p({ op: "reassign", lineId: "l0002", speaker: "ADÁN" }), lines), "MARÍA → ADÁN: «Hola.»");
    assert.equal(describePatch(p({ op: "insert", afterId: "l0002", speaker: "ADÁN", text: "¡Eh!" }), lines), "Añadida: ADÁN «¡Eh!»");
    assert.equal(describePatch(p({ op: "insert", afterId: "l0002", text: "Ruido." }), lines), "Añadida: (acotación) «Ruido.»");
    assert.equal(describePatch(p({ op: "delete", lineId: "l0003" }), lines), "Borrada: (acotación) «Se va.»");
  });

  test("long quotes are shortened; unknown lines still describe something", () => {
    const long = "a".repeat(80);
    assert.match(describePatch(p({ op: "insert", afterId: null, text: long }), lines), /«a{40}…»$/);
    assert.equal(describePatch(p({ op: "delete", lineId: "n-x" }), lines), "Borrada: línea añadida");
  });
});
