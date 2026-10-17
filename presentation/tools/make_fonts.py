"""Cut static Google Sans Flex instances out of the variable font, named the way the template refers to them.

The template uses family names "Google Sans Flex", "Google Sans Flex Medium" and "Google Sans Flex SemiBold".
LibreOffice can't map those to a variable font's named instances, so we write one static TTF per family
(regular + bold where it makes sense). Output: assets/fonts/static/*.ttf, which tools/lo.ps1 installs into
the portable LibreOffice's own font folder (no system install).

Usage: .venv\\Scripts\\python.exe tools\\make_fonts.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/fonts/GoogleSansFlex-VF.ttf"
OUT = ROOT / "assets/fonts/static"

# (family, style, wght, is_bold)
CUTS = [
    ("Google Sans Flex", "Regular", 400, False),
    ("Google Sans Flex", "Bold", 700, True),
    ("Google Sans Flex Medium", "Regular", 500, False),
    ("Google Sans Flex Medium", "Bold", 700, True),
    ("Google Sans Flex SemiBold", "Regular", 600, False),
    ("Google Sans Flex SemiBold", "Bold", 800, True),
]


def rename(font: TTFont, family: str, style: str) -> None:
    name = font["name"]
    full = f"{family} {style}" if style != "Regular" else family
    ps = (family + "-" + style).replace(" ", "")
    for rec in list(name.names):
        if rec.nameID in (16, 17, 21, 22, 25):  # typographic / WWS / variations names would override ours
            name.removeNames(nameID=rec.nameID)
    for pid, eid, lid in ((3, 1, 0x409), (1, 0, 0)):
        name.setName(family, 1, pid, eid, lid)
        name.setName(style, 2, pid, eid, lid)
        name.setName(f"{ps};GSF-static", 3, pid, eid, lid)
        name.setName(full, 4, pid, eid, lid)
        name.setName(ps, 6, pid, eid, lid)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for family, style, wght, bold in CUTS:
        vf = TTFont(SRC)
        f = instantiateVariableFont(vf, {"wght": wght, "opsz": 18, "wdth": 100, "ROND": 0, "slnt": 0}, updateFontNames=False)
        for t in ("STAT",):
            if t in f:
                del f[t]
        rename(f, family, style)
        os2, head = f["OS/2"], f["head"]
        os2.usWeightClass = wght
        os2.fsSelection = (os2.fsSelection & ~0b1100001) | (0b100000 if bold else 0b1000000)  # BOLD or REGULAR bit
        head.macStyle = 1 if bold else 0
        path = OUT / f"{family.replace(' ', '')}-{style}.ttf"
        f.save(path)
        print(path.name)


if __name__ == "__main__":
    main()
