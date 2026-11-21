import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { dumpPlay, consolidatePlay, consolidationMessage, consolidatedIds } from "../tools/consolidate.js";
import { validatePlay } from "../lib.js";

const play = {
  slug: "obra",
  title: "Obra",
  characters: [{ name: "MARÍA" }, { name: "JESÚS" }],
  cast: [{ actor: "Lorea", characters: ["MARÍA"] }],
  lines: [
    { id: "l0001", t: "ESCENA 1", scene: true },
    { id: "l0002", s: "MARÍA", t: "Hola." },
    { id: "l0003", s: "JESÚS", t: "Adiós." },
  ],
};
const who = { author: "Lorea", deviceId: "d1" };
const edit = { id: "p1", op: "edit", lineId: "l0002", text: "Hola, Jesús.", ...who, createdAt: "2026-11-21T10:00:00.000Z" };
const insert = { id: "p2", op: "insert", lineId: "n-p2", afterId: "l0003", speaker: "MARÍA", text: "¡Espera!", ...who, createdAt: "2026-11-21T10:01:00.000Z" };
const undone = { id: "p3", op: "delete", lineId: "l0003", ...who, createdAt: "2026-11-21T10:02:00.000Z", undone: true };
const NOW = "2026-11-22T09:00:00.000Z";

describe("dumpPlay", () => {
  test("writes every play in the repo byte for byte as it is (same format as the importer)", () => {
    const dir = new URL("../plays/", import.meta.url);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json");
    assert.ok(files.length >= 4);
    for (const f of files) {
      const text = fs.readFileSync(new URL(f, dir), "utf8");
      assert.equal(dumpPlay(JSON.parse(text)), text, f);
    }
  });
});

describe("consolidatePlay", () => {
  test("applies the active patches and drops the overlay marks", () => {
    const { play: out } = consolidatePlay(play, [edit, insert, undone], NOW);
    assert.deepEqual(out.lines, [
      { id: "l0001", t: "ESCENA 1", scene: true },
      { id: "l0002", s: "MARÍA", t: "Hola, Jesús." },
      { id: "l0003", s: "JESÚS", t: "Adiós." },
      { id: "n-p2", s: "MARÍA", t: "¡Espera!" },
    ]);
    assert.deepEqual(validatePlay(out), []);
  });

  test("records a revision with every patch id it consumed (undone ones too) and keeps old revisions", () => {
    const before = { ...play, revisions: [{ date: "2026-11-01T00:00:00.000Z", patches: ["old"] }] };
    const { play: out } = consolidatePlay(before, [edit, insert, undone], NOW);
    assert.deepEqual(out.revisions, [
      { date: "2026-11-01T00:00:00.000Z", patches: ["old"] },
      { date: NOW, patches: ["p1", "p2", "p3"] },
    ]);
    assert.equal(play.revisions, undefined, "input not mutated");
  });

  test("patches already in a revision are not applied again nor recorded twice", () => {
    const first = consolidatePlay(play, [edit], NOW).play;
    const second = consolidatePlay(first, [edit, insert], "2026-11-23T09:00:00.000Z");
    assert.deepEqual(second.play.revisions.map((r) => r.patches), [["p1"], ["p2"]]);
    assert.deepEqual(second.consumed.map((p) => p.id), ["p2"]);
  });

  test("nothing new → no revision, play unchanged", () => {
    const { play: out, consumed } = consolidatePlay(play, [], NOW);
    assert.deepEqual(consumed, []);
    assert.deepEqual(out, play);
  });

  test("validation problems of the result are reported, not hidden", () => {
    const stranger = { ...edit, id: "p9", op: "reassign", speaker: "PEPE", text: undefined };
    const { errors } = consolidatePlay(play, [stranger], NOW);
    assert.match(errors.join("\n"), /PEPE/);
  });
});

describe("consolidatedIds", () => {
  test("every patch id in the play's revisions", () => {
    const p = { ...play, revisions: [{ date: "a", patches: ["x", "y"] }, { date: "b", patches: ["z"] }] };
    assert.deepEqual(consolidatedIds(p), ["x", "y", "z"]);
    assert.deepEqual(consolidatedIds(play), []);
  });
});

describe("consolidationMessage", () => {
  test("title line + one line per applied patch + undone count", () => {
    const { consumed } = consolidatePlay(play, [edit, insert, undone], NOW);
    const msg = consolidationMessage(play, consumed);
    const [title, blank, ...rest] = msg.split("\n");
    assert.equal(title, "mananettis: consolidate 2 corrections into «Obra»");
    assert.equal(blank, "");
    assert.ok(rest.some((l) => l === "- 2026-11-21 10:00 Lorea: Texto de MARÍA «Hola.» → «Hola, Jesús.»"), msg);
    assert.ok(rest.some((l) => l === "- 2026-11-21 10:01 Lorea: Añadida: MARÍA «¡Espera!»"), msg);
    assert.ok(rest.some((l) => l === "Undone (not applied): 1"), msg);
  });
});
