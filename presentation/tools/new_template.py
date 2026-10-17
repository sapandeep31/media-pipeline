"""Write a plain 16:9 starter template (deck/template.pptx) for decks that have no organiser template.

Slides: 1 cover (title + subtitle), 2 content (section label at the top), 3 closing.
build_deck.py treats the first text shape on a slide as its section label, so slide 2 can be
duplicated for every content slide via ORDER/KEYS in content.py.

Usage: .venv\\Scripts\\python.exe tools\\new_template.py [deck\\template.pptx] [--dark]
"""
import argparse
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

FONT = "Google Sans Flex"


def box(slide, x, y, w, h, text, size, color, bold=False):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tb.name = "template-text"
    tf = tb.text_frame
    tf.word_wrap = True
    r = tf.paragraphs[0].add_run()
    r.text = text
    r.font.name, r.font.size, r.font.bold = FONT, Pt(size), bold
    r.font.color.rgb = RGBColor.from_string(color)


def fill(slide, color):
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = RGBColor.from_string(color)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default="deck/template.pptx")
    ap.add_argument("--dark", action="store_true", help="dark cover and closing slides")
    a = ap.parse_args()
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(10), Inches(5.625)
    blank = prs.slide_layouts[6]
    ink, cover_bg = ("FFFFFF", "0B1220") if a.dark else ("111827", "FFFFFF")

    s = prs.slides.add_slide(blank)                       # 1 cover
    fill(s, cover_bg)
    box(s, 0.6, 1.8, 8.8, 1.0, "Deck title", 40, ink, bold=True)

    s = prs.slides.add_slide(blank)                       # 2 content
    fill(s, "FFFFFF")
    box(s, 0.29, 0.6, 9.4, 0.45, "Section label", 16, "000000", bold=True)

    s = prs.slides.add_slide(blank)                       # 3 closing
    fill(s, cover_bg)
    box(s, 0.6, 2.2, 8.8, 1.0, "Thank you", 40, ink, bold=True)

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(out)
    print(f"template {out}")


if __name__ == "__main__":
    main()
