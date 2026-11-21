"""Tests for import_docx: docx fixtures are built in memory, mimicking the real plays' quirks."""

import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

import import_docx as imp

NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'


def run(text, b=False, i=False):
    props = ("<w:b/>" if b else "") + ("<w:i/>" if i else "")
    rpr = f"<w:rPr>{props}</w:rPr>" if props else ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def para(*runs, style=None):
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{ppr}{''.join(runs)}</w:p>"


def docx(*paras):
    xml = f"<w:document {NS}><w:body>{''.join(paras)}</w:body></w:document>"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", xml)
    return buf.getvalue()


def parse(*paras):
    return imp.parse_play(imp.read_paragraphs(docx(*paras)))


HEADER = para(run("EL PUNTO ROJO", b=True), run("  "), run("Ivonne, Yurema, Encarna", b=True), style="Heading1")


class ReadParagraphs(unittest.TestCase):
    def test_runs_keep_bold_italic_and_style(self):
        (p,) = imp.read_paragraphs(docx(para(run("A:", b=True), run(" hola "), run("sale", i=True), style="Heading3")))
        self.assertEqual(p.style, "Heading3")
        self.assertEqual(p.runs, [("A:", True, False), (" hola ", False, False), ("sale", False, True)])

    def test_bold_val_false_is_not_bold(self):
        xml = para('<w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t>x</w:t></w:r>')
        (p,) = imp.read_paragraphs(docx(xml))
        self.assertEqual(p.runs, [("x", False, False)])

    def test_tabs_and_breaks_become_spaces(self):
        (p,) = imp.read_paragraphs(docx(para("<w:r><w:t>a</w:t><w:tab/><w:t>b</w:t><w:br/><w:t>c</w:t></w:r>")))
        self.assertEqual(p.text, "a b c")


class Header(unittest.TestCase):
    def test_title_and_actors_from_the_first_heading(self):
        play, _ = parse(HEADER, para(run("ESCENA UNO", b=True)))
        self.assertEqual(play["title"], "El punto rojo")
        self.assertEqual(play["slug"], "el-punto-rojo")
        self.assertEqual(play["actors"], ["Ivonne", "Yurema", "Encarna"])
        self.assertEqual(play["cast"], [])

    def test_title_and_actors_in_one_bold_run_split_on_wide_spaces(self):
        play, _ = parse(para(run("LA CITA        Lorea, Pedro, Manel", b=True), style="Heading1"))
        self.assertEqual(play["title"], "La cita")
        self.assertEqual(play["actors"], ["Lorea", "Pedro", "Manel"])

    def test_unsplittable_header_is_kept_whole_with_a_warning(self):
        play, warnings = parse(para(run("LOS PEORES LADRONES AURI - MARCOS", b=True), style="Heading1"))
        self.assertEqual(play["title"], "Los peores ladrones auri - marcos")
        self.assertEqual(play["actors"], [])
        self.assertTrue(any("título" in w for w in warnings))


class Lines(unittest.TestCase):
    def lines(self, *paras):
        play, _ = parse(HEADER, *paras)
        return [{k: v for k, v in l.items() if k != "id"} for l in play["lines"]]

    def test_replica_with_colon_inside_or_outside_bold(self):
        self.assertEqual(
            self.lines(
                para(run("ESCENA UNO", b=True)),
                para(run("DIRECTORA:", b=True), run(" ¿La  humedad?")),
                para(run("EMPLEADA", b=True), run(": ¡¡NO LO TOQUES!!")),
            ),
            [
                {"t": "ESCENA UNO", "scene": True},
                {"s": "DIRECTORA", "t": "¿La humedad?"},
                {"s": "EMPLEADA", "t": "¡¡NO LO TOQUES!!"},
            ],
        )

    def test_parenthesis_in_the_speaker_goes_to_the_text(self):
        (line,) = self.lines(para(run("RAQUEL (desde fuera):", b=True), run(" ¡¡¡NO SALUDES!!!")))
        self.assertEqual(line, {"s": "RAQUEL", "t": "(desde fuera) ¡¡¡NO SALUDES!!!"})

    def test_italic_inside_a_replica_is_wrapped_in_parentheses(self):
        (line,) = self.lines(
            para(run("BECARIA:", b=True), run(" ¿Este? "), run("Se acerca al cuadro.", i=True), run(" ¿Esto?"))
        )
        self.assertEqual(line["t"], "¿Este? (Se acerca al cuadro.) ¿Esto?")

    def test_italic_already_in_parentheses_is_left_alone(self):
        (line,) = self.lines(para(run("JESÚS:", b=True), run(" (Leyendo.) ", i=True), run("«Leche»")))
        self.assertEqual(line["t"], "(Leyendo.) «Leche»")

    def test_whole_italic_paragraphs_and_lone_bold_are_stage_directions(self):
        self.assertEqual(
            self.lines(
                para(run("Suena el teléfono", i=True), run(". ", i=True), run("Mira.", i=True)),
                para(run("(Lo gira)", i=True)),
                para(run("OSCURO.", b=True)),
                para(run("Sale. Música", i=True), run(".   ", i=True), run("OSCURO", b=True, i=True)),
            ),
            [
                {"t": "Suena el teléfono. Mira.", "acot": True},
                {"t": "(Lo gira)", "acot": True},
                {"t": "OSCURO.", "acot": True},
                {"t": "Sale. Música. OSCURO", "acot": True},
            ],
        )

    def test_scene_headings_in_any_style(self):
        lines = self.lines(
            para(run("ESCENA UNO", b=True, i=True), run(" ", i=True)),
            para(run("A:", b=True), run(" x")),
            para(run("ESCENA 2", b=True), style="Heading3"),
            para(run("A:", b=True), run(" y")),
            para(run("ESCENA 3", b=True), style="Heading1"),
        )
        self.assertEqual([l["t"] for l in lines if l.get("scene")], ["ESCENA UNO", "ESCENA 2", "ESCENA 3"])

    def test_implicit_first_scene_when_a_later_one_exists(self):
        lines = self.lines(para(run("Un salón.", i=True)), para(run("ESCENA 2", b=True)))
        self.assertEqual(lines[0], {"t": "ESCENA 1", "scene": True})
        self.assertEqual(lines[1]["t"], "Un salón.")

    def test_no_scenes_at_all_stays_without_scenes(self):
        lines = self.lines(para(run("Escena para dos personajes", i=True)), para(run("A:", b=True), run(" x")))
        self.assertFalse(any(l.get("scene") for l in lines))

    def test_empty_paragraphs_are_skipped(self):
        self.assertEqual(self.lines(para(run("   ")), para()), [])

    def test_plain_unrecognised_paragraph_becomes_acot_with_a_warning(self):
        play, warnings = parse(HEADER, para(run("Texto suelto")))
        self.assertEqual(play["lines"][0]["acot"], True)
        self.assertTrue(any("Texto suelto" in w for w in warnings))


class Play(unittest.TestCase):
    def test_ids_characters_in_order_of_appearance(self):
        play, _ = parse(
            HEADER,
            para(run("ESCENA UNO", b=True)),
            para(run("EMPLEADA:", b=True), run(" a")),
            para(run("DIRECTORA:", b=True), run(" b")),
            para(run("EMPLEADA:", b=True), run(" c")),
        )
        self.assertEqual([l["id"] for l in play["lines"]], ["l0001", "l0002", "l0003", "l0004"])
        self.assertEqual(play["characters"], [{"name": "EMPLEADA"}, {"name": "DIRECTORA"}])

    def test_dump_has_one_line_per_replica_and_round_trips(self):
        play, _ = parse(HEADER, para(run("A:", b=True), run(" «hola»")))
        text = imp.dump_play(play)
        self.assertIn('\n    {"id":"l0001","s":"A","t":"«hola»"}\n', text)
        self.assertEqual(json.loads(text), play)


class Main(unittest.TestCase):
    def test_writes_the_json_and_refuses_to_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "obra.docx"
            src.write_bytes(docx(HEADER, para(run("A:", b=True), run(" x"))))
            out = Path(tmp) / "plays"
            self.assertEqual(imp.main([str(src), "--out", str(out)]), 0)
            written = json.loads((out / "el-punto-rojo.json").read_text(encoding="utf-8"))
            self.assertEqual(written["lines"][0]["t"], "x")
            self.assertEqual(imp.main([str(src), "--out", str(out)]), 1)
            self.assertEqual(imp.main([str(src), "--out", str(out), "--slug", "otra"]), 0)
            self.assertTrue((out / "otra.json").exists())


if __name__ == "__main__":
    unittest.main()
