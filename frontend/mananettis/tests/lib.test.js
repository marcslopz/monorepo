import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeName,
  charactersOfActor,
  isMyLine,
  isSkippable,
  stripParens,
  sceneStarts,
  findSceneStart,
  nextSceneIdx,
  prevSceneIdx,
  nextLineIdx,
  prevLineIdx,
  validatePlay,
  actorLabel,
} from "../lib.js";

const play = {
  title: "Obra",
  characters: [
    { name: "HIPO", aliases: ["HIPÓLITA"] },
    { name: "FORENSE", aliases: ["EL FORENSE"] },
    { name: "RAMONA" },
    { name: "TODOS" },
  ],
  cast: [
    { actor: "Yurema", characters: ["HIPO"] },
    { actor: "Auri", characters: ["RAMONA", "FORENSE"] },
  ],
  lines: [
    { id: "l0001", t: "ESCENA PRIMERA", scene: true },
    { id: "l0002", t: "Entran todos.", acot: true },
    { id: "l0003", s: "HIPO", t: "Hola." },
    { id: "l0004", s: "RAMONA", t: "¡Ay!" },
    { id: "l0005", t: "ESCENA SEGUNDA", scene: true },
    { id: "l0006", s: "EL FORENSE", t: "Muerto." },
    { id: "l0007", s: "HIPÓLITA", t: "(Llora) Qué pena." },
    { id: "l0008", t: "OSCURO", acot: true },
  ],
};

describe("normalizeName", () => {
  test("ignores case, accents and extra spaces", () => {
    assert.equal(normalizeName("  Hipólita "), "HIPOLITA");
    assert.equal(normalizeName("el   forense"), "EL FORENSE");
  });
  test("tolerates missing names", () => {
    assert.equal(normalizeName(undefined), "");
  });
});

describe("charactersOfActor / isMyLine", () => {
  test("includes the aliases of every character the actor plays", () => {
    assert.deepEqual(
      [...charactersOfActor(play, "Auri")].sort(),
      ["EL FORENSE", "FORENSE", "RAMONA"],
    );
  });
  test("unknown actor plays nothing", () => {
    assert.equal(charactersOfActor(play, "Nadie").size, 0);
  });
  test("matches lines by any alias, regardless of accents", () => {
    const mine = charactersOfActor(play, "Yurema");
    assert.equal(isMyLine(play.lines[2], mine), true);
    assert.equal(isMyLine(play.lines[6], mine), true);
    assert.equal(isMyLine(play.lines[3], mine), false);
  });
  test("scene and stage-direction lines are never mine", () => {
    const mine = charactersOfActor(play, "Yurema");
    assert.equal(isMyLine(play.lines[0], mine), false);
    assert.equal(isMyLine(play.lines[1], mine), false);
  });
});

test("isSkippable: scenes and stage directions", () => {
  assert.deepEqual(play.lines.map(isSkippable), [true, true, false, false, true, false, false, true]);
});

test("stripParens removes inline stage directions", () => {
  assert.equal(stripParens("(Llora) Qué  pena. (Sale.)"), "Qué pena.");
});

describe("scene navigation", () => {
  const { lines } = play;
  test("sceneStarts lists index, id and title of each scene", () => {
    assert.deepEqual(sceneStarts(lines), [
      { idx: 0, id: "l0001", title: "ESCENA PRIMERA" },
      { idx: 4, id: "l0005", title: "ESCENA SEGUNDA" },
    ]);
  });
  test("findSceneStart returns the scene line at or before idx", () => {
    assert.equal(findSceneStart(lines, 3), 0);
    assert.equal(findSceneStart(lines, 4), 4);
    assert.equal(findSceneStart(lines, 7), 4);
  });
  test("findSceneStart is 0 when no scene precedes", () => {
    assert.equal(findSceneStart([{ id: "a", s: "X", t: "y" }], 0), 0);
  });
  test("nextSceneIdx goes to the next scene, or -1 at the last one", () => {
    assert.equal(nextSceneIdx(lines, 2), 4);
    assert.equal(nextSceneIdx(lines, 5), -1);
  });
  test("prevSceneIdx goes to the previous scene, or 0 from the first", () => {
    assert.equal(prevSceneIdx(lines, 6), 0);
    assert.equal(prevSceneIdx(lines, 2), 0);
  });
});

describe("line navigation skips scenes and stage directions", () => {
  const { lines } = play;
  test("nextLineIdx", () => {
    assert.equal(nextLineIdx(lines, 3), 5);
    assert.equal(nextLineIdx(lines, 0), 2);
  });
  test("nextLineIdx stops at the last line", () => {
    assert.equal(nextLineIdx(lines, 7), 7);
  });
  test("prevLineIdx", () => {
    assert.equal(prevLineIdx(lines, 5), 3);
    assert.equal(prevLineIdx(lines, 2), 0);
  });
});

describe("validatePlay", () => {
  test("a valid play has no errors", () => {
    assert.deepEqual(validatePlay(play), []);
  });
  test("reports duplicate or missing ids", () => {
    const bad = { ...play, lines: [...play.lines, { id: "l0003", s: "HIPO", t: "x" }, { s: "HIPO", t: "y" }] };
    const errors = validatePlay(bad);
    assert.ok(errors.some((e) => e.includes("duplicate id l0003")));
    assert.ok(errors.some((e) => e.includes("missing id")));
  });
  test("reports speakers that are not a character or alias", () => {
    const bad = { ...play, lines: [...play.lines, { id: "l0100", s: "HIPOO", t: "x" }] };
    assert.deepEqual(validatePlay(bad), ["l0100: unknown speaker HIPOO"]);
  });
  test("reports cast entries pointing to unknown characters", () => {
    const bad = { ...play, cast: [{ actor: "X", characters: ["NADIE"] }] };
    assert.deepEqual(validatePlay(bad), ["cast X: unknown character NADIE"]);
  });
});

test("actorLabel shows the actor and their characters in title case", () => {
  assert.equal(actorLabel({ actor: "Auri", characters: ["RAMONA", "EL FORENSE"] }), "Auri (Ramona / El Forense)");
  assert.equal(actorLabel({ actor: "Yvonne", characters: ["GARCÍA"] }), "Yvonne (García)");
});
