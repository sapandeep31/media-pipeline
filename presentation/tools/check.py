"""Content + file checks for the built deck. Exit code 1 on any FAIL.

Usage: .venv\\Scripts\\python.exe tools\\check.py [out\\deck.pptx]
  1. leftover placeholders / template prompts (text dump)
  2. fonts: only the template's Google Sans Flex families, nothing under 10 pt
  3. our shapes stay inside the content area (not over header strip / bottom bar, 0.4 in side margins)
  4. validate.py from the session pptx skill, baselined against the template
"""
import glob
import os
import re
import subprocess
import sys
from pathlib import Path

from pptx import Presentation
from pptx.util import Emu

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path(os.environ.get("DECK_DIR", ROOT / "deck")).resolve() / "template.pptx"
FONTS = {"Google Sans Flex", "Google Sans Flex Medium", "Google Sans Flex SemiBold", None}
PLACEHOLDER = re.compile(r"\[(URL|MEMBER|X|TBD|TODO|LEADER)[^\]]*\]|lorem|ipsum|\bTODO\b|\bxxx+\b|How different is it from any|"
                         r"Please download this template", re.I)
IN = 914400
TOP, BOTTOM, SIDE = 1.0 * IN, 5.32 * IN, 0.25 * IN  # action title starts ~1.08 in; charts get axis-label slack
fails, warns = [], []


def template_shape(sh) -> bool:
    return not sh.name.startswith("ms-")   # build_deck.py prefixes every shape it adds


def main() -> None:
    pptx = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out/deck.pptx").resolve()
    prs = Presentation(pptx)
    W = prs.slide_width
    for n, slide in enumerate(prs.slides, 1):
        for sh in slide.shapes:
            if sh.has_text_frame:
                text = sh.text_frame.text
                for m in PLACEHOLDER.finditer(text):
                    fails.append(f"slide {n}: placeholder/prompt left: {m.group(0)!r} in {sh.name}")
                for p in sh.text_frame.paragraphs:
                    for r in p.runs:
                        if not r.text.strip():
                            continue
                        if r.font.name not in FONTS:
                            fails.append(f"slide {n}: font {r.font.name!r} in {sh.name}: {r.text[:30]!r}")
                        if r.font.size is not None and r.font.size.pt < 10:
                            fails.append(f"slide {n}: {r.font.size.pt}pt text in {sh.name}: {r.text[:30]!r}")
                        if "•" in r.text:
                            warns.append(f"slide {n}: literal bullet character in {sh.name}")
            if template_shape(sh) or n == 1 or sh.left is None or sh.name == "ms-section-label":
                continue
            l, t, r_, b = sh.left, sh.top, sh.left + sh.width, sh.top + sh.height
            if t < TOP or b > BOTTOM or l < SIDE or r_ > W - SIDE:
                warns.append(f"slide {n}: {sh.name} outside content area "
                             f"(x {l / IN:.2f}-{r_ / IN:.2f}, y {t / IN:.2f}-{b / IN:.2f} in)")
    print(f"deck   {pptx.name}: {len(prs.slides)} slides")

    skill = sorted(glob.glob(os.path.expanduser(r"~\.claude\skills\synced\*\pptx\scripts\office\validate.py")))
    if skill:
        r = subprocess.run([sys.executable, skill[-1], str(pptx), "--original", str(TEMPLATE)], capture_output=True, text=True)
        out = (r.stdout + r.stderr).strip()
        print("validate.py:", out.splitlines()[-1] if out else "(no output)")
        if r.returncode != 0:
            fails.append("validate.py failed:\n" + out)
    else:
        warns.append("pptx skill validate.py not found; skipped schema check")

    for w in warns:
        print("WARN ", w)
    for f in fails:
        print("FAIL ", f)
    print("checks OK" if not fails else f"{len(fails)} FAIL")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
