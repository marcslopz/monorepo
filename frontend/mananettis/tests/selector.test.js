import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  visiblePlays,
  pickPlay,
  charactersOfNames,
  charactersOfActor,
  speakingCharacters,
  selectionLabel,
} from "../lib.js";

const index = {
  plays: [
    { slug: "cadaver", title: "El cadáver", hidden: true },
    { slug: "cita", title: "La cita" },
    { slug: "ladrones", title: "Los peores ladrones" },
  ],
};

describe("visiblePlays", () => {
  test("hides plays marked hidden", () => {
    assert.deepEqual(visiblePlays(index, false).map((p) => p.slug), ["cita", "ladrones"]);
  });
  test("shows everything with ?all=1", () => {
    assert.deepEqual(visiblePlays(index, true).map((p) => p.slug), ["cadaver", "cita", "ladrones"]);
  });
});

describe("pickPlay", () => {
  const plays = visiblePlays(index, false);
  test("uses the requested slug when it is visible", () => {
    assert.equal(pickPlay(plays, "ladrones").slug, "ladrones");
  });
  test("falls back to the first visible play", () => {
    assert.equal(pickPlay(plays, "cadaver").slug, "cita");
    assert.equal(pickPlay(plays, null).slug, "cita");
  });
  test("is undefined when there is nothing to show", () => {
    assert.equal(pickPlay([], "cita"), undefined);
  });
});

const play = {
  characters: [
    { name: "HIPO", aliases: ["HIPÓLITA"] },
    { name: "RAMONA" },
    { name: "FORENSE", aliases: ["EL FORENSE"] },
    { name: "MUDO" },
  ],
  cast: [{ actor: "Auri", characters: ["RAMONA", "FORENSE"] }],
  lines: [
    { id: "l1", t: "ESCENA", scene: true },
    { id: "l2", s: "RAMONA", t: "¡Ay!" },
    { id: "l3", s: "HIPÓLITA", t: "Hola." },
    { id: "l4", s: "EL FORENSE", t: "Muerto." },
    { id: "l5", t: "Entra MUDO.", acot: true },
  ],
};

describe("charactersOfNames (multi-selection)", () => {
  test("joins several characters with their aliases", () => {
    assert.deepEqual([...charactersOfNames(play, ["HIPO", "FORENSE"])].sort(), ["EL FORENSE", "FORENSE", "HIPO", "HIPOLITA"]);
  });
  test("empty selection plays nothing", () => {
    assert.equal(charactersOfNames(play, []).size, 0);
  });
  test("charactersOfActor is the selection of the actor's cast", () => {
    assert.deepEqual([...charactersOfActor(play, "Auri")].sort(), [...charactersOfNames(play, ["RAMONA", "FORENSE"])].sort());
  });
});

test("speakingCharacters lists characters with lines, in declared order", () => {
  assert.deepEqual(speakingCharacters(play), ["HIPO", "RAMONA", "FORENSE"]);
});

describe("selectionLabel", () => {
  test("actor plus chosen characters", () => {
    assert.equal(selectionLabel("Auri", ["RAMONA", "EL FORENSE"]), "Auri (Ramona / El Forense)");
  });
  test("characters only when no actor is chosen", () => {
    assert.equal(selectionLabel("", ["HIPO"]), "Hipo");
  });
});
