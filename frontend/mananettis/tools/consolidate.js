// Consolidation: fold the shared corrections (D1, via GET /api/patches) into plays/<slug>.json.
//
//   node tools/consolidate.js <slug> [--api https://mananettis.pages.dev] [--now <iso>]
//
// Writes the JSON (same format as tools/import_docx.py) with a new entry in `revisions` listing every
// patch id it consumed, and prints the commit message. The rows are marked consolidated afterwards
// (make d1-clear), reading the ids back from `revisions` of the JSON already deployed.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { applyPatches, validatePlay, describePatch, consolidatedIds } from "../lib.js";

const DEFAULT_API = "https://mananettis.pages.dev";

// Header pretty-printed (indent 2), one compact line per line of the script: readable diffs.
export function dumpPlay(play) {
  const { lines, ...head } = play;
  const text = JSON.stringify(head, null, 2).slice(0, -2); // drop "\n}"
  const body = lines.map((l) => "    " + JSON.stringify(l)).join(",\n");
  return `${text},\n  "lines": [\n${body}\n  ]\n}\n`;
}

export { consolidatedIds };

// → { play, consumed, errors }. `consumed` = patches not in any revision yet (undone ones included:
// they are recorded so they get marked too, but they change nothing).
export function consolidatePlay(play, patches, now) {
  const seen = new Set(consolidatedIds(play));
  const consumed = patches.filter((p) => !seen.has(p.id));
  if (consumed.length === 0) return { play, consumed, errors: [] };
  const lines = applyPatches(play.lines, consumed).map(({ patches: _p, inserted: _i, ...line }) => line);
  const out = { ...play, lines, revisions: [...(play.revisions ?? []), { date: now, patches: consumed.map((p) => p.id) }] };
  return { play: out, consumed, errors: validatePlay(out) };
}

const when = (iso) => iso.slice(0, 16).replace("T", " "); // UTC, minutes

export function consolidationMessage(play, consumed) {
  const active = consumed.filter((p) => !p.undone);
  const undoneCount = consumed.length - active.length;
  const added = consumed
    .filter((p) => p.op === "insert")
    .map((p) => (p.speaker ? { id: p.lineId, s: p.speaker, t: p.text } : { id: p.lineId, t: p.text, acot: true }));
  const known = [...play.lines, ...added];
  const body = [...active]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => `- ${when(p.createdAt)} ${p.author}: ${describePatch(p, known)}`);
  if (undoneCount) body.push("", `Undone (not applied): ${undoneCount}`);
  return [`mananettis: consolidate ${active.length} correction${active.length === 1 ? "" : "s"} into «${play.title}»`, "", ...body, ""].join("\n");
}

function parseArgs(argv) {
  const args = { api: DEFAULT_API, now: new Date().toISOString() };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--api") args.api = argv[++i];
    else if (argv[i] === "--now") args.now = argv[++i];
    else args.slug = argv[i];
  }
  return args;
}

async function main(argv) {
  const { slug, api, now } = parseArgs(argv);
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    console.error("Uso: node tools/consolidate.js <slug> [--api URL] [--now ISO]");
    return 2;
  }
  const file = new URL(`../plays/${slug}.json`, import.meta.url);
  const play = JSON.parse(fs.readFileSync(file, "utf8"));
  const res = await fetch(`${api}/api/patches?play=${slug}`);
  if (!res.ok) {
    console.error(`GET ${api}/api/patches?play=${slug} → HTTP ${res.status}`);
    return 1;
  }
  const { patches } = await res.json();
  const result = consolidatePlay(play, patches, now);
  if (result.consumed.length === 0) {
    console.error(`«${play.title}»: no hay correcciones nuevas que consolidar.`);
    return 0;
  }
  if (result.errors.length) {
    console.error(`El guion resultante no es válido; no se escribe nada:\n  ${result.errors.join("\n  ")}`);
    return 1;
  }
  fs.writeFileSync(file, dumpPlay(result.play));
  console.error(`plays/${slug}.json: ${result.consumed.length} parches consolidados. Mensaje de commit:\n`);
  console.log(consolidationMessage(play, result.consumed));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
