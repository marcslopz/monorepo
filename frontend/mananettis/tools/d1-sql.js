// SQL for the D1 admin make targets (wrangler `d1 execute --command` takes no bind parameters, so
// every value is validated or escaped here).
//
//   node tools/d1-sql.js clear <slug> <commit>
//   node tools/d1-sql.js rollback <slug> <since> [--author NAME] [--device ID] (--select | --update)
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { consolidatedIds } from "../lib.js";

const SLUG = /^[a-z0-9-]{1,64}$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const COMMIT = /^[0-9a-f]{7,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?)?$/;

function check(value, re, what) {
  if (typeof value !== "string" || !re.test(value)) throw new Error(`${what} no válido: ${JSON.stringify(value)}`);
  return value;
}

const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Marks as consolidated the rows the play JSON already contains (ids from its revisions).
export function clearSql(play, { commit, now }) {
  check(play.slug, SLUG, "slug");
  check(commit, COMMIT, "commit");
  const ids = consolidatedIds(play).map((id) => check(id, ID, "id de parche"));
  if (ids.length === 0) return null;
  return (
    `UPDATE patches SET consolidated_at = ${quote(now)}, consolidated_in = ${quote(commit)} ` +
    `WHERE play = ${quote(play.slug)} AND consolidated_at IS NULL AND id IN (${ids.map(quote).join(", ")});`
  );
}

// Bulk undo of the live (not consolidated) patches created since a date, optionally by one author/device.
export function rollbackSql({ slug, since, author, device, now }) {
  check(slug, SLUG, "slug");
  check(since, DATE, "SINCE (fecha ISO)");
  let where = `WHERE play = ${quote(slug)} AND consolidated_at IS NULL AND undone = 0 AND created_at >= ${quote(since)}`;
  if (author) where += ` AND author = ${quote(author.slice(0, 64))}`;
  if (device) where += ` AND device_id = ${quote(check(device, ID, "DEVICE"))}`;
  return {
    select: `SELECT id, created_at, author, device_id, op, line_id, speaker, text FROM patches ${where} ORDER BY created_at;`,
    update: `UPDATE patches SET undone = 1, undone_by = 'rollback', undone_device_id = 'make-rollback', undone_at = ${quote(now)} ${where};`,
  };
}

function main([cmd, slug, ...rest]) {
  const now = new Date().toISOString();
  if (cmd === "clear") {
    const play = JSON.parse(fs.readFileSync(new URL(`../plays/${check(slug, SLUG, "slug")}.json`, import.meta.url), "utf8"));
    const sql = clearSql(play, { commit: rest[0], now });
    if (!sql) { console.error(`plays/${slug}.json no tiene revisiones: nada que marcar.`); return 3; }
    console.log(sql);
    return 0;
  }
  if (cmd === "rollback") {
    const [since, ...flags] = rest;
    const opt = (name) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : undefined; };
    const sql = rollbackSql({ slug, since, author: opt("--author"), device: opt("--device"), now });
    console.log(flags.includes("--update") ? sql.update : sql.select);
    return 0;
  }
  console.error("Uso: node tools/d1-sql.js clear <slug> <commit> | rollback <slug> <since> [--author X] [--device Y] [--select|--update]");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exitCode = 2;
  }
}
