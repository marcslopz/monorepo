import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePlay, visiblePlays } from "../lib.js";

const load = async (slug) =>
  JSON.parse(await readFile(new URL(`../plays/${slug}.json`, import.meta.url), "utf8"));

test("cadaver-garcia.json is a valid play", async () => {
  const play = await load("cadaver-garcia");
  assert.deepEqual(validatePlay(play), []);
  assert.equal(play.lines.length, 688);
  assert.equal(play.lines.filter((l) => l.scene).length, 4);
});

test("cadaver-garcia.json ids are sequential l0001…", async () => {
  const { lines } = await load("cadaver-garcia");
  lines.forEach((l, i) => assert.equal(l.id, `l${String(i + 1).padStart(4, "0")}`));
});

test("plays/index.json lists every play file, and each one is valid", async () => {
  const index = JSON.parse(await readFile(new URL("../plays/index.json", import.meta.url), "utf8"));
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(new URL("../plays/", import.meta.url)))
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((f) => f.replace(/\.json$/, ""));
  assert.deepEqual(index.plays.map((p) => p.slug).sort(), files.sort());
  for (const entry of index.plays) {
    const play = await load(entry.slug);
    assert.equal(play.slug, entry.slug);
    assert.equal(play.title, entry.title);
    assert.deepEqual(validatePlay(play), [], entry.slug);
  }
});

const winter = [
  { slug: "la-cita", lines: 188, scenes: 2, characters: ["MARÍA", "JESÚS", "ADÁN"] },
  { slug: "los-peores-ladrones", lines: 136, scenes: 0, characters: ["RAQUEL", "RAMÓN"] },
  { slug: "el-punto-rojo", lines: 160, scenes: 3, characters: ["DIRECTORA", "EMPLEADA", "BECARIA"] },
];

for (const expected of winter) {
  test(`${expected.slug}.json: imported play with every character cast`, async () => {
    const play = await load(expected.slug);
    assert.equal(play.lines.length, expected.lines);
    assert.equal(play.lines.filter((l) => l.scene).length, expected.scenes);
    assert.deepEqual(play.characters.map((c) => c.name), expected.characters);
    assert.deepEqual(play.cast.flatMap((c) => c.characters).sort(), [...expected.characters].sort());
    play.lines.forEach((l, i) => assert.equal(l.id, `l${String(i + 1).padStart(4, "0")}`));
    for (const l of play.lines) assert.equal(l.t.split("(").length, l.t.split(")").length, `${l.id}: ${l.t}`);
  });
}

test("index.json: winter plays visible, the Cadáver hidden", async () => {
  const index = JSON.parse(await readFile(new URL("../plays/index.json", import.meta.url), "utf8"));
  assert.deepEqual(visiblePlays(index, false).map((p) => p.slug), winter.map((w) => w.slug));
  assert.ok(visiblePlays(index, true).some((p) => p.slug === "cadaver-garcia"));
});
