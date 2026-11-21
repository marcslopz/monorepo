import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { onRequestGet, onRequestPost, ensureSchema } from "../functions/api/patches.js";
import { onRequestPost as onUndo } from "../functions/api/patches/undo.js";
import { fakeD1 } from "./d1-fake.js";

let env;
beforeEach(() => { env = { DB: fakeD1() }; });

const URL_BASE = "https://mananettis.pages.dev";
const get = (query) => onRequestGet({ request: new Request(`${URL_BASE}/api/patches${query}`), env });
const post = (body) =>
  onRequestPost({
    request: new Request(`${URL_BASE}/api/patches`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }),
    env,
  });
const undo = (body) =>
  onUndo({ request: new Request(`${URL_BASE}/api/patches/undo`, { method: "POST", body: JSON.stringify(body) }), env });

let n = 0;
const patch = (fields = {}) => ({
  id: `p${++n}`,
  play: "la-cita",
  op: "edit",
  lineId: "l0002",
  text: "Hola, Jesús.",
  author: "Lorea",
  deviceId: "dev-1",
  createdAt: `2026-11-21T10:00:${String(n % 60).padStart(2, "0")}.000Z`,
  ...fields,
});

describe("GET /api/patches", () => {
  test("empty play → []", async () => {
    const res = await get("?play=la-cita");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { patches: [] });
  });

  test("needs a valid play slug", async () => {
    assert.equal((await get("")).status, 400);
    assert.equal((await get("?play=../etc")).status, 400);
  });

  test("not cached (corrections must show up on reload)", async () => {
    assert.match((await get("?play=la-cita")).headers.get("cache-control"), /no-store/);
  });
});

describe("POST /api/patches", () => {
  test("stores a patch and GET returns it as sent, only for its play, ordered by createdAt", async () => {
    const later = patch({ createdAt: "2026-11-21T12:00:00.000Z" });
    const earlier = patch({ op: "delete", text: undefined, createdAt: "2026-11-21T11:00:00.000Z" });
    const other = patch({ play: "el-punto-rojo" });
    for (const p of [later, earlier, other]) assert.equal((await post(p)).status, 201);
    const { patches } = await (await get("?play=la-cita")).json();
    const { text, ...earlierSent } = earlier;
    assert.deepEqual(patches, [earlierSent, later]);
  });

  test("insert keeps afterId, null included, and the speaker", async () => {
    const atStart = patch({ op: "insert", lineId: "n-a", afterId: null, speaker: "ADÁN", text: "¡Eh!" });
    const after = patch({ op: "insert", lineId: "n-b", afterId: "l0002", text: "Ruido." });
    await post(atStart);
    await post(after);
    const { patches } = await (await get("?play=la-cita")).json();
    assert.deepEqual(patches, [atStart, after]);
  });

  test("same id twice is accepted once (safe to retry)", async () => {
    const p = patch();
    assert.equal((await post(p)).status, 201);
    assert.equal((await post({ ...p, text: "otro" })).status, 200);
    const { patches } = await (await get("?play=la-cita")).json();
    assert.deepEqual(patches, [p]);
  });

  test("rejects invalid patches with 400", async () => {
    const bad = [
      "not json",
      patch({ op: "explode" }),
      patch({ author: "" }),
      patch({ deviceId: undefined }),
      patch({ play: "Bad Slug" }),
      patch({ lineId: "" }),
      patch({ op: "edit", text: "" }),
      patch({ op: "reassign", speaker: "" }),
      patch({ op: "insert", lineId: "n-x", text: "x" }), // afterId missing (null is fine, absent is not)
      patch({ text: "x".repeat(2001) }),
      patch({ createdAt: "ayer" }),
      patch({ undone: true }),
    ];
    for (const body of bad) {
      const res = await post(body);
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
      assert.ok((await res.json()).error);
    }
    assert.deepEqual((await (await get("?play=la-cita")).json()).patches, []);
  });
});

describe("POST /api/patches/undo", () => {
  test("marks the patch undone; GET returns undone: true", async () => {
    const p = patch();
    await post(p);
    const res = await undo({ id: p.id, play: "la-cita", author: "Pedro", deviceId: "dev-2" });
    assert.equal(res.status, 200);
    const { patches } = await (await get("?play=la-cita")).json();
    assert.deepEqual(patches, [{ ...p, undone: true }]);
  });

  test("unknown id (or wrong play) → 404; missing author → 400", async () => {
    await post(patch({ id: "x1" }));
    assert.equal((await undo({ id: "nope", play: "la-cita", author: "Pedro", deviceId: "d" })).status, 404);
    assert.equal((await undo({ id: "x1", play: "el-punto-rojo", author: "Pedro", deviceId: "d" })).status, 404);
    assert.equal((await undo({ id: "x1", play: "la-cita", deviceId: "d" })).status, 400);
  });

  test("undoing twice is fine", async () => {
    await post(patch({ id: "x2" }));
    const body = { id: "x2", play: "la-cita", author: "Pedro", deviceId: "d" };
    assert.equal((await undo(body)).status, 200);
    assert.equal((await undo(body)).status, 200);
  });
});

describe("without the D1 binding", () => {
  test("every route answers 503 with a clear error", async () => {
    env = {};
    for (const res of [await get("?play=la-cita"), await post(patch()), await undo({ id: "x", play: "la-cita", author: "a", deviceId: "d" })]) {
      assert.equal(res.status, 503);
      assert.match((await res.json()).error, /DB/);
    }
  });
});

describe("consolidated rows", () => {
  test("GET and undo ignore rows marked consolidated", async () => {
    await post(patch({ id: "c1" }));
    await post(patch({ id: "c2" }));
    await env.DB.prepare("UPDATE patches SET consolidated_at = ?, consolidated_in = ? WHERE id = ?").bind("2026-11-22T00:00:00Z", "abc123", "c1").run();
    const { patches } = await (await get("?play=la-cita")).json();
    assert.deepEqual(patches.map((p) => p.id), ["c2"]);
    assert.equal((await undo({ id: "c1", play: "la-cita", author: "Pedro", deviceId: "d" })).status, 404);
  });

  test("a table from before the consolidated columns is upgraded keeping its rows", async () => {
    await env.DB.prepare(`CREATE TABLE patches (id TEXT PRIMARY KEY, play TEXT NOT NULL, op TEXT NOT NULL,
      line_id TEXT NOT NULL, after_id TEXT, speaker TEXT, text TEXT, author TEXT NOT NULL, device_id TEXT NOT NULL,
      created_at TEXT NOT NULL, received_at TEXT NOT NULL, undone INTEGER NOT NULL DEFAULT 0, undone_by TEXT,
      undone_device_id TEXT, undone_at TEXT)`).run();
    await env.DB.prepare(`INSERT INTO patches (id, play, op, line_id, text, author, device_id, created_at, received_at)
      VALUES ('old', 'la-cita', 'edit', 'l0002', 'x', 'Lorea', 'd', '2026-11-21T10:00:00.000Z', '2026-11-21T10:00:00.000Z')`).run();
    const { patches } = await (await get("?play=la-cita")).json();
    assert.deepEqual(patches.map((p) => p.id), ["old"]);
    const cols = (await env.DB.prepare("SELECT name FROM pragma_table_info('patches')").all()).results.map((r) => r.name);
    assert.ok(cols.includes("consolidated_at") && cols.includes("consolidated_in"));
    await ensureSchema(env.DB); // idempotent
  });
});
