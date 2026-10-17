"""Render a PPTX with the portable LibreOffice: PDF + one PNG per slide + a contact sheet.

Usage: .venv\\Scripts\\python.exe tools\\render.py [out\\deck.pptx] [--only 3,5] [--dpi 192]
Writes next to the input: <name>.pdf, png\\slide-NN.png, contact-sheet.png
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOFFICE = Path(os.environ.get("SOFFICE", ROOT / "vendor/libreoffice/program/soffice.exe"))


def to_pdf(pptx: Path) -> Path:
    if not SOFFICE.exists():
        sys.exit(f"LibreOffice not found at {SOFFICE}; run tools\\lo.ps1 first")
    out_dir = pptx.parent
    # private profile so a running LibreOffice/first-run dialog never blocks the headless convert
    profile = Path(tempfile.mkdtemp(prefix="lo-profile-"))
    try:
        cmd = [str(SOFFICE), f"-env:UserInstallation={profile.as_uri()}", "--headless", "--norestore",
               "--convert-to", "pdf", "--outdir", str(out_dir), str(pptx)]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        pdf = out_dir / (pptx.stem + ".pdf")
        if r.returncode != 0 or not pdf.exists():
            sys.exit(f"soffice failed ({r.returncode}):\n{r.stdout}\n{r.stderr}")
        return pdf
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def to_png(pdf: Path, only: set[int], dpi: int) -> list[Path]:
    png_dir = pdf.parent / "png"
    png_dir.mkdir(exist_ok=True)
    if not only:
        for old in png_dir.glob("slide-*.png"):
            old.unlink()
    doc = pymupdf.open(pdf)
    paths = []
    for i, page in enumerate(doc, 1):
        p = png_dir / f"slide-{i:02d}.png"
        if not only or i in only:
            page.get_pixmap(dpi=dpi).save(p)
        paths.append(p)
    print(f"pdf    {pdf}  ({doc.page_count} pages, {page.rect.width / 72:.2f} x {page.rect.height / 72:.3f} in, "
          f"{pdf.stat().st_size / 1e6:.1f} MB)")
    return paths


def contact_sheet(paths: list[Path], out: Path, cols: int = 3, w: int = 600) -> None:
    from PIL import Image, ImageDraw
    thumbs = [Image.open(p).convert("RGB") for p in paths if p.exists()]
    if not thumbs:
        return
    h = int(w * thumbs[0].height / thumbs[0].width)
    gap, lab = 16, 22
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + gap) + gap, rows * (h + gap + lab) + gap), (229, 231, 235))
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(thumbs):
        x, y = gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap + lab)
        sheet.paste(t.resize((w, h), Image.LANCZOS), (x, y + lab))
        d.text((x, y + 4), f"{i + 1}", fill=(17, 24, 39))
    sheet.save(out)
    print(f"sheet  {out}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx", nargs="?", default=str(ROOT / "out/deck.pptx"))
    ap.add_argument("--only", default="")
    ap.add_argument("--dpi", type=int, default=192)  # 10 in wide -> 1920 px
    a = ap.parse_args()
    only = {int(x) for x in a.only.split(",") if x}
    pptx = Path(a.pptx).resolve()
    pdf = to_pdf(pptx)
    paths = to_png(pdf, only, a.dpi)
    print(f"png    {paths[0].parent}")
    if not only:
        contact_sheet(paths, pdf.parent / "contact-sheet.png")


if __name__ == "__main__":
    main()
