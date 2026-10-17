"""Tile check frames into contact sheets: tile.py <glob> <out.png> [cols] [width]"""
import sys, glob
from PIL import Image, ImageDraw

files = sorted(glob.glob(sys.argv[1]), key=lambda f: float(f.split("-t")[-1].split("-")[0].replace(".png", "")) if "-t" in f else 0)
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
w = int(sys.argv[4]) if len(sys.argv) > 4 else 960
ims = [Image.open(f).convert("RGB") for f in files]
h = int(w * 9 / 16)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), (0, 0, 0))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    im = im.resize((w, h))
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    d.rectangle([x, y, x + 330, y + 22], fill=(0, 0, 0))
    d.text((x + 4, y + 4), f.split("\\")[-1][-40:], fill=(255, 255, 0))
sheet.save(sys.argv[2])
print(len(ims), "->", sys.argv[2])
