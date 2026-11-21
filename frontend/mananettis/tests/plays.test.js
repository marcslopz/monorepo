import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePlay } from "../lib.js";

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
