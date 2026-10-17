"""Starter deck content. tools/build_deck.py reads this file; edit it, then run .\\make.ps1

- Template: deck/template.pptx (make one with tools/new_template.py, or drop in an organiser's template).
- Units are inches on a 10 x 5.625 in slide. Content area: x 0.40-9.60, y ~1.75-5.30.
- Rules: skills/deck-studio/ (SOP, design, QA).
- Every number needs a source (deck/sources.md) or a label: simulated / measured / estimate.
"""

# ---------------------------------------------------------------- tokens
FONT = "Google Sans Flex"
FONT_MED = "Google Sans Flex Medium"
FONT_SEMI = "Google Sans Flex SemiBold"     # rendered as FONT + bold for portability

INK_STRONG, INK, INK_MUTED = "111827", "1F2937", "6B7280"
LINE, TINT = "E5E7EB", "F3F4F6"
TEAL_FILL, TEAL_TEXT, TEAL_TINT = "10B981", "059669", "ECFDF5"   # swap for the brand accent
AMBER = "D97706"

TITLE_PT, BODY_PT = 22, 13
LABEL_Y, LABEL_H = 0.60, 0.40
TITLE_Y, TITLE_H = 1.05, 0.50
CONTENT_X, CONTENT_W = 0.40, 9.20

# ---------------------------------------------------------------- structure
# Template slide numbers in final order; repeat a number to duplicate that slide. KEYS name each output slide.
ORDER = [1, 2, 2, 2, 3]
KEYS = ["cover", "problem", "solution", "proof", "close"]
COVER = {}   # label -> value pairs for templates with a "Team name:"-style cover


def bars(x, y, label_w, bar_w, bar_h, gap, rows, vmax=None, fmt="{:.1f}", size=11, value_w=1.0):
    """Horizontal bars as native shapes: label | bar (zero baseline, length ∝ value) | value at the bar end.
    Use instead of a chart for 2–5 bars: renders identically in LibreOffice, Google Slides and PowerPoint."""
    vmax = vmax or max(v for _, v, _ in rows)
    out = []
    for i, (label, v, color) in enumerate(rows):
        yy = y + i * (bar_h + gap)
        w = max(0.04, bar_w * v / vmax)
        out += [
            {"type": "text", "x": x, "y": yy, "w": label_w - 0.1, "h": bar_h, "size": size, "color": INK,
             "anchor": "m", "paras": [label]},
            {"type": "rect", "x": x + label_w, "y": yy, "w": w, "h": bar_h, "fill": color},
            {"type": "text", "x": x + label_w + w + 0.08, "y": yy, "w": value_w, "h": bar_h, "size": size + 1,
             "font": FONT_SEMI, "color": INK_STRONG, "anchor": "m", "paras": [fmt.format(v)]},
        ]
    return out


def box(x, y, w, h, head, sub=None, fill="FFFFFF", line=LINE, head_color=INK_STRONG, sub_color=INK_MUTED,
        head_size=11, sub_size=10, align="l"):
    """A plain diagram box: rectangle + heading + optional second line."""
    paras = [{"runs": [(head, {"font": FONT_SEMI, "size": head_size, "color": head_color})], "align": align}]
    if sub:
        paras.append({"runs": [(sub, {"size": sub_size, "color": sub_color})], "align": align, "line": 1.05})
    return [{"type": "rect", "x": x, "y": y, "w": w, "h": h, "fill": fill, "line": line, "line_pt": 0.75},
            {"type": "text", "x": x + 0.1, "y": y, "w": w - 0.2, "h": h, "anchor": "m", "paras": paras}]


def col_text(x, y, w, head, body, body_h=1.0):
    return [{"type": "text", "x": x, "y": y, "w": w, "h": 0.3, "font": FONT_SEMI, "size": 13,
             "color": INK_STRONG, "paras": [head]},
            {"type": "text", "x": x, "y": y + 0.32, "w": w, "h": body_h, "size": 12, "color": INK,
             "line": 1.1, "paras": [body]}]


SLIDES = {
    "cover": {"label": "Product name", "move_label": False, "elements": [
        {"type": "text", "x": 0.7, "y": 3.0, "w": 8.6, "h": 0.5, "size": 18, "color": INK_MUTED,
         "paras": ["One-line positioning: what it is and for whom"]},
    ]},
    "problem": {
        "label": "The problem",
        "title": "A full-sentence claim, twelve words or fewer",
        "elements": [
            *col_text(0.40, 1.85, 4.30, "What hurts", "Who has the problem, how often, what it costs. One sourced number."),
            *col_text(5.05, 1.85, 4.55, "Why now", "What changed that makes this solvable today."),
        ],
    },
    "solution": {
        "label": "The solution",
        "title": "Our product does X so that Y",
        "elements": [*col_text(0.40, 1.85, 9.20, "How it works", "Three steps, one line each.")],
    },
    "proof": {
        "label": "Proof",
        "title": "The headline number, stated as a claim",
        "elements": [
            {"type": "text", "x": 0.40, "y": 1.95, "w": 4.4, "h": 0.9, "font": FONT_SEMI, "size": 54,
             "paras": [[("10", {"color": INK_MUTED}), ("  →  ", {"color": INK_MUTED, "size": 40}),
                        ("3", {"color": TEAL_TEXT})]]},
            {"type": "text", "x": 0.40, "y": 3.0, "w": 4.3, "h": 0.6, "size": 13,
             "paras": ["What the number means, and how it was measured."]},
        ],
    },
    "close": {"label": "Thank you", "move_label": False},
}
