import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("index.html exists and has a title", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<title>[^<]+<\/title>/);
});

test("index.html links the favicon and the iOS home-screen icon, and both files exist", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const [rel, file] of [["icon", "favicon.svg"], ["apple-touch-icon", "apple-touch-icon.png"]]) {
    assert.match(html, new RegExp(`<link rel="${rel}" href="${file}"`));
    const bytes = await readFile(new URL(`../${file}`, import.meta.url));
    assert.ok(bytes.length > 0, file);
  }
});
