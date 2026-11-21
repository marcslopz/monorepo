"""docx -> Mañanettis play JSON draft (stdlib only).

    python tools/import_docx.py plays/sources/<x>.docx --out plays [--slug <slug>] [--force]

Format of the source plays (see the plan): first Heading1 = title + actors; a replica starts with a
bold `NAME:`; whole-italic paragraphs (and a lone bold `OSCURO`) are stage directions; italic inside a
replica is a stage direction too, so it gets wrapped in parentheses (the app shows it, doesn't read it);
`ESCENA <n>` paragraphs start scenes. The output is a draft: review it, fill `cast`, then commit.
"""

import argparse
import io
import json
import re
import sys
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

SCENE_RE = re.compile(r"^ESCENA\s+\S+$", re.IGNORECASE)
SPEAKER_RE = re.compile(r"^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ .'-]*?)\s*(\([^)]*\))?\s*:\s*(.*)$", re.DOTALL)


@dataclass
class Paragraph:
    style: str
    runs: list  # [(text, bold, italic)]

    @property
    def text(self):
        return squash("".join(t for t, _, _ in self.runs))


def squash(text):
    return re.sub(r"\s+", " ", text).strip()


def _on(rpr, tag):
    if rpr is None:
        return False
    el = rpr.find(W + tag)
    return el is not None and el.get(W + "val") not in ("0", "false")


def read_paragraphs(source):
    """source: path or bytes of a .docx."""
    data = source if isinstance(source, bytes) else Path(source).read_bytes()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    paragraphs = []
    for p in root.iter(W + "p"):
        style_el = p.find(f"{W}pPr/{W}pStyle")
        runs = []
        for r in p.iter(W + "r"):
            rpr = r.find(W + "rPr")
            text = "".join(
                (el.text or "") if el.tag == W + "t" else " "
                for el in r
                if el.tag in (W + "t", W + "tab", W + "br")
            )
            if text:
                runs.append((text, _on(rpr, "b"), _on(rpr, "i")))
        paragraphs.append(Paragraph(style_el.get(W + "val") if style_el is not None else "", runs))
    return paragraphs


def sentence_case(text):
    text = text.lower()
    return text[:1].upper() + text[1:]


def slugify(text):
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def parse_header(paragraph, warnings):
    """Title and actors. They come as two bold runs, or one run with a wide gap between them."""
    bold = [t for t, b, _ in paragraph.runs if b and t.strip()]
    if len(bold) >= 2:
        title, actors = bold[0], " ".join(bold[1:])
    else:
        raw = "".join(t for t, _, _ in paragraph.runs).strip()
        parts = re.split(r"\s{3,}", raw, maxsplit=1)
        title, actors = (parts + [""])[:2]
    if not actors:
        warnings.append(f"cabecera sin actores separables, revisar título: {paragraph.text!r}")
    return sentence_case(squash(title)), [a.strip() for a in re.split(r"[,\-–]", actors) if a.strip()]


def replica_text(runs, speaker_len):
    """Body of a replica: drop the `NAME:` prefix, wrap italic stretches in parentheses."""
    # Merge consecutive runs with the same italic flag, then cut away the speaker prefix.
    merged = []
    for text, _, italic in runs:
        if merged and merged[-1][1] == italic:
            merged[-1][0] += text
        else:
            merged.append([text, italic])
    out, skip = [], speaker_len
    for text, italic in merged:
        if skip:
            cut = min(skip, len(text))
            text, skip = text[cut:], skip - cut
        if italic and text.strip() and not text.strip().startswith("("):
            lead = text[: len(text) - len(text.lstrip())]
            trail = text[len(text.rstrip()):]
            text = f"{lead}({text.strip()}){trail}"
        out.append(text)
    return squash("".join(out))


def classify(paragraph, warnings):
    text = paragraph.text
    if not text:
        return None
    if SCENE_RE.match(text):
        return {"t": text, "scene": True}
    visible = [(t, b, i) for t, b, i in paragraph.runs if t.strip()]
    first_bold = visible[0][1]
    raw = "".join(t for t, _, _ in paragraph.runs)
    m = SPEAKER_RE.match(raw.lstrip())
    if first_bold and m:
        name, aside = m.group(1), m.group(2)
        prefix_len = len(raw) - len(raw.lstrip()) + m.start(3)
        body = replica_text(paragraph.runs, prefix_len)
        return {"s": squash(name), "t": squash(f"{aside} {body}") if aside else body}
    if all(i for _, _, i in visible) or all(b for _, b, _ in visible):
        return {"t": text, "acot": True}
    warnings.append(f"párrafo sin personaje, importado como acotación: {text!r}")
    return {"t": text, "acot": True}


def parse_play(paragraphs, slug=None):
    warnings = []
    paragraphs = [p for p in paragraphs if p.text]
    header = paragraphs[0] if paragraphs and paragraphs[0].style.startswith("Heading") and not SCENE_RE.match(paragraphs[0].text) else None
    title, actors = parse_header(header, warnings) if header else ("", [])
    if not header:
        warnings.append("sin cabecera (Heading1 con título y actores)")
    lines = [l for l in (classify(p, warnings) for p in paragraphs[1 if header else 0:]) if l]
    if any(l.get("scene") for l in lines) and not lines[0].get("scene"):
        lines.insert(0, {"t": "ESCENA 1", "scene": True})
    characters = []
    for l in lines:
        if "s" in l and l["s"] not in characters:
            characters.append(l["s"])
    play = {
        "slug": slug or slugify(title),
        "title": title,
        "actors": actors,
        "characters": [{"name": c} for c in characters],
        "cast": [],
        "lines": [{"id": f"l{i:04d}", **l} for i, l in enumerate(lines, 1)],
    }
    return play, warnings


def dump_play(play):
    """Header pretty-printed, one compact line per replica (readable diffs when consolidating)."""
    head = {k: v for k, v in play.items() if k != "lines"}
    text = json.dumps(head, ensure_ascii=False, indent=2)[:-2]  # drop "\n}"
    lines = ",\n".join("    " + json.dumps(l, ensure_ascii=False, separators=(",", ":")) for l in play["lines"])
    return f'{text},\n  "lines": [\n{lines}\n  ]\n}}\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("file")
    ap.add_argument("--out", default="plays")
    ap.add_argument("--slug")
    ap.add_argument("--force", action="store_true", help="overwrite an existing JSON (it may be reviewed!)")
    args = ap.parse_args(argv)

    play, warnings = parse_play(read_paragraphs(args.file), slug=args.slug)
    target = Path(args.out) / f"{play['slug']}.json"
    if target.exists() and not args.force:
        print(f"{target} ya existe (¿revisado a mano?). Usa --force o --slug.", file=sys.stderr)
        return 1
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dump_play(play), encoding="utf-8")

    n = lambda key: sum(1 for l in play["lines"] if l.get(key))
    print(f"{target}: «{play['title']}» — {len(play['lines'])} líneas, {n('scene')} escenas, {n('acot')} acotaciones")
    print(f"  personajes: {', '.join(c['name'] for c in play['characters'])}")
    print(f"  actores (cabecera): {', '.join(play['actors']) or '—'} → rellenar `cast` a mano")
    for w in warnings:
        print(f"  AVISO: {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
