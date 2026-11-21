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

// Normalized names (aliases included) of every character the actor plays.
export function charactersOfActor(play, actor) {
  const entry = play.cast.find((c) => c.actor === actor);
  const mine = new Set();
  for (const name of entry?.characters ?? []) {
    const character = play.characters.find((c) => normalizeName(c.name) === normalizeName(name));
    for (const n of character ? namesOf(character) : [normalizeName(name)]) mine.add(n);
  }
  return mine;
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
  return `${actor} (${characters.map(titleCase).join(" / ")})`;
}
