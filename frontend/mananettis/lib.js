// Pure logic for Mañanettis (no DOM): shared by the app (browser) and the tests (node --test).
//
// A play is { title, characters: [{name, aliases?}], cast: [{actor, characters}], lines },
// and each line is { id, s, t } or { id, t, scene: true } or { id, t, acot: true }.

export function normalizeName(name) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function namesOf(character) {
  return [character.name, ...(character.aliases ?? [])].map(normalizeName);
}

// Normalized names (aliases included) of the chosen characters (several for double roles).
export function charactersOfNames(play, names) {
  const mine = new Set();
  for (const name of names) {
    const character = play.characters.find((c) => normalizeName(c.name) === normalizeName(name));
    for (const n of character ? namesOf(character) : [normalizeName(name)]) mine.add(n);
  }
  return mine;
}

// Normalized names (aliases included) of every character the actor plays.
export function charactersOfActor(play, actor) {
  const entry = play.cast.find((c) => c.actor === actor);
  return charactersOfNames(play, entry?.characters ?? []);
}

// Characters with at least one line, in the order the play declares them (for the checkboxes).
export function speakingCharacters(play) {
  const speakers = new Set(play.lines.filter((l) => !isSkippable(l)).map((l) => normalizeName(l.s)));
  return play.characters
    .filter((c) => namesOf(c).some((n) => speakers.has(n)))
    .map((c) => c.name);
}

// plays/index.json: { plays: [{ slug, title, hidden? }] }. Hidden ones only with ?all=1.
export function visiblePlays(index, showAll) {
  return index.plays.filter((p) => showAll || !p.hidden);
}

export function pickPlay(plays, slug) {
  return plays.find((p) => p.slug === slug) ?? plays[0];
}

export function isSkippable(line) {
  return Boolean(line.scene || line.acot);
}

export function isMyLine(line, myNames) {
  return !isSkippable(line) && myNames.has(normalizeName(line.s));
}

// Inline stage directions go in parentheses; they are shown but not read aloud.
export function stripParens(text) {
  return text.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

export function sceneStarts(lines) {
  return lines.flatMap((l, idx) => (l.scene ? [{ idx, id: l.id, title: l.t }] : []));
}

export function findSceneStart(lines, idx) {
  for (let i = idx; i >= 0; i--) if (lines[i].scene) return i;
  return 0;
}

export function nextSceneIdx(lines, idx) {
  for (let i = idx + 1; i < lines.length; i++) if (lines[i].scene) return i;
  return -1;
}

export function prevSceneIdx(lines, idx) {
  for (let i = findSceneStart(lines, idx) - 1; i >= 0; i--) if (lines[i].scene) return i;
  return 0;
}

export function nextLineIdx(lines, idx) {
  let i = Math.min(idx + 1, lines.length - 1);
  while (i < lines.length - 1 && isSkippable(lines[i])) i++;
  return i;
}

export function prevLineIdx(lines, idx) {
  let i = Math.max(idx - 1, 0);
  while (i > 0 && isSkippable(lines[i])) i--;
  return i;
}

// List of human-readable problems; empty when the play is consistent.
export function validatePlay(play) {
  const errors = [];
  const known = new Set(play.characters.flatMap(namesOf));
  const characterNames = new Set(play.characters.map((c) => normalizeName(c.name)));
  const seen = new Set();
  play.lines.forEach((line, i) => {
    if (!line.id) {
      errors.push(`line ${i}: missing id`);
    } else if (seen.has(line.id)) {
      errors.push(`line ${i}: duplicate id ${line.id}`);
    }
    seen.add(line.id);
    if (!isSkippable(line) && !known.has(normalizeName(line.s))) {
      errors.push(`${line.id}: unknown speaker ${line.s}`);
    }
  });
  for (const { actor, characters } of play.cast) {
    for (const name of characters) {
      if (!characterNames.has(normalizeName(name))) errors.push(`cast ${actor}: unknown character ${name}`);
    }
  }
  return errors;
}

const titleCase = (name) => name.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());

// "Auri (Ramona / Forense)" for the "who are you?" selector.
export function actorLabel({ actor, characters }) {
  return selectionLabel(actor, characters);
}

// "Auri (Ramona / Forense)", or just "Ramona / Forense" without an actor.
export function selectionLabel(actor, characters) {
  const names = characters.map(titleCase).join(" / ");
  return actor ? `${actor} (${names})` : names;
}

// Corrections overlay. A patch is { id, op, lineId, afterId?, speaker?, text?, createdAt, undone? }
// with op = edit | delete | reassign | insert. Patches apply in createdAt order; undone ones, unknown
// ops and patches to lines that don't exist (any more) are ignored. The base lines are not modified:
// touched lines come back as copies with `patches: [patchId…]` (and `inserted: true` if new).
export function applyPatches(lines, patches) {
  const result = lines.map((l) => ({ ...l }));
  const indexOf = (id) => result.findIndex((l) => l.id === id);
  const mark = (line, p) => (line.patches = [...(line.patches ?? []), p.id]);
  const ordered = patches
    .filter((p) => !p.undone)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.createdAt ?? "").localeCompare(b.p.createdAt ?? "") || a.i - b.i)
    .map(({ p }) => p);

  for (const p of ordered) {
    if (p.op === "insert") {
      if (!p.lineId || indexOf(p.lineId) >= 0) continue;
      const at = p.afterId == null ? 0 : indexOf(p.afterId) + 1;
      if (at === 0 && p.afterId != null) continue;
      const line = p.speaker ? { id: p.lineId, s: p.speaker, t: p.text ?? "" } : { id: p.lineId, t: p.text ?? "", acot: true };
      line.inserted = true;
      mark(line, p);
      result.splice(at, 0, line);
      continue;
    }
    const i = indexOf(p.lineId);
    if (i < 0) continue;
    const line = result[i];
    if (p.op === "delete") {
      result.splice(i, 1);
    } else if (p.op === "edit" && typeof p.text === "string") {
      line.t = p.text;
      mark(line, p);
    } else if (p.op === "reassign" && p.speaker) {
      line.s = p.speaker;
      delete line.acot;
      delete line.scene;
      mark(line, p);
    }
  }
  return result;
}

// ctx = { author, deviceId, now (ISO string), uuid() }. Inserted lines get id "n-<uuid>".
export function newPatch(fields, { author, deviceId, now, uuid }) {
  const id = uuid();
  const lineId = fields.op === "insert" ? `n-${id}` : fields.lineId;
  return { id, ...fields, lineId, author, deviceId, createdAt: now };
}

// The patches (0–2) that turn `line` into what the edit dialog says: edit and/or reassign.
export function patchesFromEdit(line, { speaker, text }, ctx) {
  const patches = [];
  const newText = (text ?? "").trim();
  if (newText && newText !== line.t.trim()) {
    patches.push(newPatch({ op: "edit", lineId: line.id, text: newText }, ctx));
  }
  if (speaker && normalizeName(speaker) !== normalizeName(line.s)) {
    patches.push(newPatch({ op: "reassign", lineId: line.id, speaker }, ctx));
  }
  return patches;
}

export function undoPatch(patches, id) {
  return patches.map((p) => (p.id === id ? { ...p, undone: true } : p));
}

export function activePatches(patches) {
  return patches.filter((p) => !p.undone);
}

const quote = (text) => `«${text.length > 40 ? text.slice(0, 40) + "…" : text}»`;
const who = (line) => (isSkippable(line) || !line.s ? "(acotación)" : line.s);

// One line of text for the corrections list, quoting the base line it touches.
export function describePatch(p, baseLines) {
  if (p.op === "insert") return `Añadida: ${p.speaker || "(acotación)"} ${quote(p.text ?? "")}`;
  const line = baseLines.find((l) => l.id === p.lineId);
  const target = line ? `${who(line)} ${quote(line.t)}` : "línea añadida";
  if (p.op === "edit") return `Texto de ${target} → ${quote(p.text ?? "")}`;
  if (p.op === "delete") return `Borrada: ${target}`;
  if (p.op === "reassign") return line ? `${who(line)} → ${p.speaker}: ${quote(line.t)}` : `Línea añadida → ${p.speaker}`;
  return p.op;
}

// Sync with /api/patches. Local copies may carry `pending` (not on the server yet) and `pendingUndo`
// (undone here, undo not sent yet). The server is the truth for everything it has; local patches it
// doesn't have survive only while pending (a sent one that's gone was consolidated or cleared).
export function mergePatches(local, remote) {
  const localById = new Map(local.map((p) => [p.id, p]));
  const merged = remote.map(({ play, ...r }) => {
    const mine = localById.get(r.id);
    const p = { ...r };
    if (mine?.undone && !r.undone) Object.assign(p, { undone: true, pendingUndo: true });
    return p;
  });
  const remoteIds = new Set(remote.map((r) => r.id));
  return [...merged, ...local.filter((p) => !remoteIds.has(p.id) && p.pending)];
}

// The patch as POST /api/patches expects it (undo goes through /api/patches/undo).
export function toApiPatch(p, play) {
  const { pending, pendingUndo, undone, ...rest } = p;
  return { ...rest, play };
}

export function pendingCount(patches) {
  return patches.filter((p) => p.pending || p.pendingUndo).length;
}
