// Cloudflare Pages Function: shared corrections (patches) of the plays, stored in D1 (binding DB).
//   GET  /api/patches?play=<slug>  → { patches: [...] } (undone ones included, oldest first)
//   POST /api/patches  <patch>     → 201 stored | 200 already there (same id: safe to retry)
// Undo lives in ./patches/undo.js. The table is created on first use (one table, no migrations).
// Rows folded into plays/<slug>.json are marked consolidated (make d1-clear) and no longer served.

const OPS = new Set(["edit", "delete", "reassign", "insert"]);
const SLUG = /^[a-z0-9-]{1,64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const MAX_TEXT = 2000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS patches (
    id TEXT PRIMARY KEY,
    play TEXT NOT NULL,
    op TEXT NOT NULL,
    line_id TEXT NOT NULL,
    after_id TEXT,
    speaker TEXT,
    text TEXT,
    author TEXT NOT NULL,
    device_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    received_at TEXT NOT NULL,
    undone INTEGER NOT NULL DEFAULT 0,
    undone_by TEXT,
    undone_device_id TEXT,
    undone_at TEXT,
    consolidated_at TEXT,
    consolidated_in TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS patches_by_play ON patches (play, created_at)",
];

// Columns added after the first deploy (tables created before get them with ALTER TABLE).
const ADDED_COLUMNS = ["consolidated_at TEXT", "consolidated_in TEXT"];

const ready = new WeakSet(); // DBs whose schema this isolate already ensured

export async function ensureSchema(db) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  const { results } = await db.prepare("SELECT name FROM pragma_table_info('patches')").all();
  const have = new Set(results.map((r) => r.name));
  const missing = ADDED_COLUMNS.filter((c) => !have.has(c.split(" ")[0]));
  if (missing.length) await db.batch(missing.map((c) => db.prepare(`ALTER TABLE patches ADD COLUMN ${c}`)));
  ready.add(db);
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const badRequest = (error) => json({ error }, 400);

// Before the binding is set up in the Pages dashboard: a clear 503 instead of a crash.
export const noDb = (env) => (env?.DB ? null : json({ error: "DB binding not configured" }, 503));

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const shortString = (v, max = 64) => typeof v === "string" && v.length > 0 && v.length <= max;
export const isSlug = (v) => typeof v === "string" && SLUG.test(v);
export const isWho = (body) => shortString(body?.author) && shortString(body?.deviceId);

// Error message, or null when the patch is acceptable.
export function validatePatch(p) {
  if (!p || typeof p !== "object" || Array.isArray(p)) return "body must be a patch object";
  if (!shortString(p.id)) return "id";
  if (!isSlug(p.play)) return "play";
  if (!OPS.has(p.op)) return "op";
  if (!shortString(p.lineId)) return "lineId";
  if (!isWho(p)) return "author/deviceId";
  if (typeof p.createdAt !== "string" || !ISO_DATE.test(p.createdAt)) return "createdAt";
  if ("undone" in p) return "undone (use /api/patches/undo)";
  if (p.text !== undefined && (typeof p.text !== "string" || p.text.length > MAX_TEXT)) return "text";
  if (p.speaker !== undefined && !shortString(p.speaker)) return "speaker";
  if (p.op === "edit" && !p.text?.trim()) return "edit needs text";
  if (p.op === "reassign" && !p.speaker) return "reassign needs speaker";
  if (p.op === "insert") {
    if (!p.text?.trim()) return "insert needs text";
    if (!("afterId" in p) || (p.afterId !== null && !shortString(p.afterId))) return "insert needs afterId (null = at the start)";
  }
  return null;
}

// Row → the patch as the app sends it (no nulls except an insert's afterId).
function toPatch(row) {
  const p = { id: row.id, play: row.play, op: row.op, lineId: row.line_id };
  if (row.op === "insert") p.afterId = row.after_id;
  if (row.speaker != null) p.speaker = row.speaker;
  if (row.text != null) p.text = row.text;
  Object.assign(p, { author: row.author, deviceId: row.device_id, createdAt: row.created_at });
  if (row.undone) p.undone = true;
  return p;
}

export async function onRequestGet({ request, env }) {
  const missing = noDb(env);
  if (missing) return missing;
  const play = new URL(request.url).searchParams.get("play");
  if (!isSlug(play)) return badRequest("play");
  await ensureSchema(env.DB);
  const { results } = await env.DB
    .prepare("SELECT * FROM patches WHERE play = ? AND consolidated_at IS NULL ORDER BY created_at, received_at, id")
    .bind(play)
    .all();
  return json({ patches: results.map(toPatch) });
}

export async function onRequestPost({ request, env }) {
  const missing = noDb(env);
  if (missing) return missing;
  const p = await readJson(request);
  const error = validatePatch(p);
  if (error) return badRequest(error);
  await ensureSchema(env.DB);
  const { meta } = await env.DB
    .prepare(
      `INSERT OR IGNORE INTO patches
        (id, play, op, line_id, after_id, speaker, text, author, device_id, created_at, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      p.id, p.play, p.op, p.lineId, p.afterId ?? null, p.speaker ?? null, p.text ?? null,
      p.author, p.deviceId, p.createdAt, new Date().toISOString(),
    )
    .run();
  return json({ ok: true }, meta.changes ? 201 : 200);
}
