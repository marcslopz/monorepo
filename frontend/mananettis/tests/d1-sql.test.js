import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { clearSql, rollbackSql } from "../tools/d1-sql.js";
import { onRequestPost, onRequestGet } from "../functions/api/patches.js";
import { fakeD1 } from "./d1-fake.js";

const NOW = "2026-11-22T09:00:00.000Z";
const play = { slug: "la-cita", revisions: [{ date: "x", patches: ["p1", "p2"] }, { date: "y", patches: ["p3"] }] };

describe("clearSql", () => {
  test("marks only the ids in the play's revisions, only if not marked yet", () => {
    assert.equal(
      clearSql(play, { commit: "abc1234", now: NOW }),
      "UPDATE patches SET consolidated_at = '2026-11-22T09:00:00.000Z', consolidated_in = 'abc1234' " +
        "WHERE play = 'la-cita' AND consolidated_at IS NULL AND id IN ('p1', 'p2', 'p3');",
    );
  });

  test("no revisions → null (nothing to do)", () => {
    assert.equal(clearSql({ slug: "la-cita" }, { commit: "abc1234", now: NOW }), null);
  });

  test("refuses anything that could break out of the SQL string", () => {
    assert.throws(() => clearSql({ ...play, revisions: [{ patches: ["x'); DROP TABLE patches;--"] }] }, { commit: "abc1234", now: NOW }));
    assert.throws(() => clearSql({ ...play, slug: "a'b" }, { commit: "abc1234", now: NOW }));
    assert.throws(() => clearSql(play, { commit: "HEAD; --", now: NOW }));
  });
});

describe("rollbackSql", () => {
  test("preview (SELECT) and apply (UPDATE) share the same filter", () => {
    const { select, update } = rollbackSql({ slug: "la-cita", since: "2026-11-21T18:00:00Z", now: NOW });
    const where = "WHERE play = 'la-cita' AND consolidated_at IS NULL AND undone = 0 AND created_at >= '2026-11-21T18:00:00Z'";
    assert.equal(select, `SELECT id, created_at, author, device_id, op, line_id, speaker, text FROM patches ${where} ORDER BY created_at;`);
    assert.equal(update, `UPDATE patches SET undone = 1, undone_by = 'rollback', undone_device_id = 'make-rollback', undone_at = '${NOW}' ${where};`);
  });

  test("optional author / device filters; quotes in names are escaped", () => {
    const { select } = rollbackSql({ slug: "la-cita", since: "2026-11-21", author: "D'Artagnan", device: "dev-1", now: NOW });
    assert.match(select, /AND author = 'D''Artagnan' AND device_id = 'dev-1' ORDER BY/);
  });

  test("since must be a date", () => {
    assert.throws(() => rollbackSql({ slug: "la-cita", since: "ayer", now: NOW }));
    assert.throws(() => rollbackSql({ slug: "la-cita", now: NOW }));
  });

  test("against a real table: undoes just the matching rows", async () => {
    const env = { DB: fakeD1() };
    const send = (id, author, createdAt) =>
      onRequestPost({ request: new Request("https://x/api/patches", { method: "POST", body: JSON.stringify({ id, play: "la-cita", op: "delete", lineId: "l0002", author, deviceId: "d", createdAt }) }), env });
    await send("ok1", "Lorea", "2026-11-21T17:00:00.000Z");
    await send("bad1", "Troll", "2026-11-21T18:30:00.000Z");
    await send("ok2", "Lorea", "2026-11-21T18:40:00.000Z");
    const { select, update } = rollbackSql({ slug: "la-cita", since: "2026-11-21T18:00:00Z", author: "Troll", now: NOW });
    assert.deepEqual((await env.DB.prepare(select).all()).results.map((r) => r.id), ["bad1"]);
    await env.DB.prepare(update).run();
    const { patches } = await (await onRequestGet({ request: new Request("https://x/api/patches?play=la-cita"), env })).json();
    assert.deepEqual(patches.filter((p) => p.undone).map((p) => p.id), ["bad1"]);
  });
});
