#!/usr/bin/env node
// Usage: node to-pptx.mjs deck.html [out.pptx]
// Converts a Plinth HTML deck into an editable 16:9 PowerPoint file: real text boxes,
// same fonts and colors as the template, speaker notes kept. Needs pptxgenjs.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(resolve(process.cwd(), 'package.json'));
let PptxGenJS;
try { PptxGenJS = require('pptxgenjs'); }
catch {
  try { PptxGenJS = createRequire(import.meta.url)('pptxgenjs'); }
  catch {
    console.error('pptxgenjs is not installed. Run:\n  npm install pptxgenjs\n(or `npm install` in the Plinth repo root), then try again.');
    process.exit(2);
  }
}

const [file, outArg] = process.argv.slice(2);
if (!file) { console.error('usage: to-pptx.mjs <deck.html> [out.pptx]'); process.exit(2); }
const raw = readFileSync(file, 'utf8');
// Nobody edits the exported file by hand, so refuse to export a deck that still has placeholders.
{
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const lint = fileURLToPath(new URL('./lint-deck.mjs', import.meta.url));
  const r = JSON.parse(spawnSync(process.execPath, [lint, file, '--json'], { encoding: 'utf8' }).stdout);
  const holes = r.issues.filter(i => i.kind === 'unfinished');
  if (holes.length && !process.argv.includes('--allow-placeholders')) {
    for (const h of holes) console.error(`slide ${h.slide}: ${h.msg}`);
    console.error('Not exported: fill every placeholder first (or pass --allow-placeholders for a draft).');
    process.exit(1);
  }
}
const out = (outArg && !outArg.startsWith('--') ? outArg : null) || file.replace(/(\.slides)?\.html?$/i, '') + '.pptx';

// Default: each slide is rendered by Chrome exactly as the HTML shows it (charts, tables, images, fonts)
// and placed full-bleed, with speaker notes kept. --editable builds native text boxes instead.
if (!process.argv.includes('--editable')) {
  const puppeteer = (await import('puppeteer-core').catch(() => null))?.default;
  const { existsSync, writeFileSync, unlinkSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { pathToFileURL, fileURLToPath } = await import('node:url');
  const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));
  if (puppeteer && CHROME) {
    // A slides fragment (no <html>) is wrapped in the template first, next to the source so relative images resolve.
    let page = file, tmp = null;
    if (!/<html[\s>]/i.test(raw)) {
      const tpl = readFileSync(fileURLToPath(new URL('../assets/deck-template.html', import.meta.url)), 'utf8');
      const title = (raw.match(/<title>(.*?)<\/title>/) || [, 'Deck'])[1];
      tmp = page = join(dirname(resolve(file)), `.render-${process.pid}.html`);
      writeFileSync(tmp, tpl.replace(/<title>.*?<\/title>/, `<title>${title}</title>`).replace(/<!--SLIDES-->[\s\S]*<!--\/SLIDES-->/, () => raw.replace(/<title>.*?<\/title>\s*/, '')));
    }
    try {
      const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
      const p = await b.newPage(); await p.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
      await p.goto(pathToFileURL(resolve(page)).href + '?print', { waitUntil: 'networkidle0' });
      await p.evaluate(() => document.fonts.ready);
      const n = await p.evaluate(() => { document.getElementById('hint')?.remove(); document.getElementById('progress')?.remove(); return document.querySelectorAll('section').length; });
      const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
      pptx.title = (raw.match(/<title>([\s\S]*?)<\/title>/i) || [, 'Deck'])[1];
      for (let k = 0; k < n; k++) {
        const png = await p.evaluate(k => { const S = [...document.querySelectorAll('section')]; S.forEach((s, j) => s.classList.toggle('on', j === k));
          return S[k].querySelector('aside.notes')?.textContent.trim() || ''; }, k);
        await new Promise(r => setTimeout(r, 1300)); // let entrance animations finish
        const img = await p.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 720 }, encoding: 'base64' });
        const s = pptx.addSlide(); s.addImage({ data: 'image/png;base64,' + img, x: 0, y: 0, w: 13.333, h: 7.5 });
        if (png) s.addNotes(png);
      }
      await b.close();
      await pptx.writeFile({ fileName: out });
      console.log(`wrote ${out}  (${n} slides rendered exactly as the HTML, notes kept)`);
    } finally { if (tmp) try { unlinkSync(tmp); } catch {} }
    process.exit(0);
  }
  console.error('Chrome or puppeteer-core not found: falling back to editable text boxes (npm install puppeteer-core for exact slides).');
}

// ---- theme: read the deck's own CSS tokens, fall back to the template defaults ----
const tok = (name, def) => ((raw.match(new RegExp(`--${name}:\\s*([^;]+);`)) || [])[1] || def).trim();
const hex = v => (v.match(/#([0-9a-f]{6})/i) || [, '15161A'])[1].toUpperCase();
const firstFont = v => (v.match(/'([^']+)'/) || v.match(/^([^,]+)/))[1].trim();
const C = {
  bg: hex(tok('bg', '#FAFAF7')), ink: hex(tok('ink', '#15161A')), muted: hex(tok('muted', '#6B6E76')),
  line: hex(tok('line', '#E4E3DD')), panel: hex(tok('panel', '#F1F0EA')), accent: hex(tok('accent', '#2F5BEA')),
};
const FONT = firstFont(tok('font', "'Inter',system-ui")), MONO = firstFont(tok('mono', "'JetBrains Mono',monospace"));

// ---- tiny HTML helpers ----
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&middot;/g, '·');
const text = s => decode(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
const cls = tag => (tag.match(/class="([^"]*)"/) || [, ''])[1].split(/\s+/);

// Split html into top-level elements: [{tag, open, inner, cls}]
function children(html) {
  const out = [], re = /<(\/?)([a-z0-9]+)[^>]*?(\/?)>/gi, VOID = /^(br|img|hr|input|meta|link)$/i;
  let depth = 0, start = -1, open = '', name = '', m;
  while ((m = re.exec(html))) {
    const [t, close, tag, self] = m;
    if (VOID.test(tag) || self) continue;
    if (!close) { if (depth === 0) { start = m.index; open = t; name = tag.toLowerCase(); } depth++; }
    else if (--depth === 0) out.push({ tag: name, open, inner: html.slice(start + open.length, m.index), cls: cls(open) });
  }
  return out;
}

// ---- layout: 1280x720 px canvas, 96 px per inch, 0.75 pt per px ----
const IN = px => px / 96, PT = px => Math.round(px * 0.75);
const W = 1280, H = 720, PAD = 64;

// Turn one element into blocks: {kind, text, size, color, bold, font, h}
function blocks(el) {
  const c = el.cls, t = text(el.inner);
  if (c.includes('stat')) {
    const b = (el.inner.match(/<b[^>]*>([\s\S]*?)<\/b>/i) || [])[1] || '', s = (el.inner.match(/<span[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '';
    return [{ kind: 'rule' }, { text: text(b), size: 56, bold: true }, { text: text(s), size: 18, color: C.muted }];
  }
  if (c.includes('big')) return [{ text: t, size: 180, bold: true, color: C.accent, lh: 0.95 }];
  if (c.includes('quote')) return [{ text: t, size: 36 }];
  if (c.includes('who')) return [{ text: t, size: 18, color: C.muted }];
  if (c.includes('lede')) return [{ text: t, size: 24, color: C.muted }];
  if (c.includes('bar')) return [{ kind: 'bar', hi: c.includes('hi'), pct: parseFloat((el.open.match(/width:\s*([\d.]+)%/) || [, 100])[1]) }];
  if (c.includes('frame')) {
    const mono = c.includes('mono');
    const inner = mono ? [{ text: t, size: 17, font: MONO }] : children(el.inner).flatMap(blocks);
    return [{ kind: 'frame', inner }];
  }
  if (el.tag === 'ul' || el.tag === 'ol') return [{ kind: 'list', items: children(el.inner).map(li => text(li.inner)) }];
  if (el.tag === 'b') return [{ text: t, size: parseFloat((el.open.match(/font-size:\s*(\d+)px/) || [, 24])[1]), bold: true }];
  if (el.tag === 'p' || /^h[3-6]$/.test(el.tag)) return t ? [{ text: t, size: parseFloat((el.open.match(/font-size:\s*(\d+)px/) || [, 24])[1]), color: /color:\s*var\(--muted\)/.test(el.open) ? C.muted : C.ink }] : [];
  const kids = children(el.inner);
  if (!kids.length) return t ? [{ text: t, size: 24 }] : [];
  // A flex row holding a bar and its value: draw side by side.
  if (kids.some(k => k.cls.includes('bar'))) return [{ kind: 'barrow', bar: blocks(kids.find(k => k.cls.includes('bar')))[0], label: kids.filter(k => !k.cls.includes('bar')).map(k => text(k.inner)).join(' ') }];
  return kids.flatMap(blocks);
}

// Conservative width estimate: PowerPoint substitutes a wider font when Inter is not installed.
const lines = (s, size, width, mono, bold) => s.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length * size * (mono ? 0.62 : bold ? 0.58 : 0.52) / width)), 0);
function heightOf(b, width) {
  if (b.kind === 'rule') return 16;
  if (b.kind === 'bar' || b.kind === 'barrow') return 36;
  if (b.kind === 'frame') return 44 + b.inner.reduce((a, x) => a + heightOf(x, width - 44), 0);
  if (b.kind === 'list') return b.items.reduce((a, x) => a + lines(x, 24, width - 28) * 35 + 18, 0);
  return lines(b.text, b.size, width, b.font === MONO, b.bold) * b.size * (b.lh || 1.15) * 1.2 + 8; // PowerPoint line spacing is a multiple of ~1.2em
}

function draw(slide, pptx, list, x, y, w, align = 'left') {
  for (const b of list) {
    const h = heightOf(b, w);
    if (b.kind === 'rule') slide.addShape(pptx.ShapeType.line, { x: IN(x), y: IN(y), w: IN(w), h: 0, line: { color: C.ink, width: 1.5 } });
    else if (b.kind === 'bar') slide.addShape(pptx.ShapeType.rect, { x: IN(x), y: IN(y + 11), w: IN(w * b.pct / 100), h: IN(14), fill: { color: b.hi ? C.accent : C.line }, line: { type: 'none' } });
    else if (b.kind === 'barrow') {
      const bw = (w - 100) * b.bar.pct / 100;
      slide.addShape(pptx.ShapeType.rect, { x: IN(x), y: IN(y + 11), w: IN(bw), h: IN(14), fill: { color: b.bar.hi ? C.accent : C.line }, line: { type: 'none' } });
      slide.addText(b.label, { x: IN(x + bw + 12), y: IN(y), w: IN(100), h: IN(36), fontFace: FONT, fontSize: PT(28), bold: true, color: C.ink, margin: 0, valign: 'middle' });
    } else if (b.kind === 'frame') {
      slide.addShape(pptx.ShapeType.roundRect, { x: IN(x), y: IN(y), w: IN(w), h: IN(h), rectRadius: 0.12, fill: { color: C.panel }, line: { color: C.line, width: 0.75 } });
      draw(slide, pptx, b.inner, x + 22, y + 22, w - 44);
    } else if (b.kind === 'list') {
      slide.addText(b.items.map(t => ({ text: t, options: { bullet: { code: '2014', indent: 21 }, paraSpaceAfter: 13 } })),
        { x: IN(x), y: IN(y), w: IN(w), h: IN(h), fontFace: FONT, fontSize: PT(24), color: C.ink, margin: 0, valign: 'top', lineSpacingMultiple: 1.2 });
    } else slide.addText(b.text, {
      x: IN(x), y: IN(y), w: IN(w), h: IN(h), fontFace: b.font || FONT, fontSize: PT(b.size), bold: !!b.bold,
      color: b.color || C.ink, margin: 0, valign: 'top', align, lineSpacingMultiple: b.lh || 1.15,
    });
    y += h + 10;
  }
  return y;
}

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in, 16:9
pptx.title = text((raw.match(/<title>([\s\S]*?)<\/title>/i) || [, 'Deck'])[1]);

const sections = [...raw.matchAll(/<section([^>]*)>([\s\S]*?)<\/section>/gi)];
for (const [, attrs, body] of sections) {
  const slide = pptx.addSlide();
  
  slide.background = { color: C.bg };
  const notes = text((body.match(/<aside[^>]*class="[^"]*notes[^"]*"[^>]*>([\s\S]*?)<\/aside>/i) || [, ''])[1]);
  if (notes) slide.addNotes(notes);
  let rest = body.replace(/<aside[\s\S]*?<\/aside>/gi, '');
  const centered = /class="[^"]*\bcenter\b/.test(attrs);
  // unwrap .fill wrappers
  const top = children(rest).flatMap(e => e.cls.includes('fill') ? children(e.inner) : [e]);
  const source = top.find(e => e.cls.includes('source'));
  const content = top.filter(e => e !== source);

  const cw = W - PAD * 2;
  // measure a centered title slide to place it vertically in the middle
  const stack = [];
  for (const e of content) {
    if (e.cls.includes('eyebrow')) stack.push({ text: text(e.inner).toUpperCase(), size: 14, bold: true, color: C.muted, charSpacing: 1 });
    else if (e.tag === 'h1') stack.push({ text: text(e.inner), size: 72, bold: true, lh: 1.05, head: true });
    else if (e.tag === 'h2') stack.push({ text: text(e.inner), size: 48, bold: true, lh: 1.1, head: true });
    else if (e.cls.includes('row')) stack.push({ kind: 'row', cols: children(e.inner) });
    else stack.push(...blocks(e));
  }
  if (source) stack.push({ kind: 'source', text: text(source.inner) });

  if (centered) {
    const items = stack.filter(b => b.kind !== 'row');
    const hw = 960;
    const total = items.reduce((a, b) => a + heightOf({ ...b, kind: undefined, size: b.size || 14, text: b.text || '' }, hw) + 10, 0);
    draw(slide, pptx, items.map(b => b.kind === 'source' ? { text: b.text, size: 14, color: C.muted } : b), (W - hw) / 2, Math.max(PAD, (H - total) / 2), hw, 'center');
    continue;
  }

  let y = PAD;
  for (const b of stack) {
    if (b.kind === 'source') {
      slide.addText(b.text, { x: IN(PAD), y: IN(H - 56 - 22), w: IN(cw), h: IN(22), fontFace: FONT, fontSize: PT(14), color: C.muted, margin: 0, valign: 'bottom' });
    } else if (b.kind === 'row') {
      y += 30;
      const gut = 24, unit = (cw - gut * 11) / 12;
      let x = PAD, bottom = y;
      const heights = b.cols.map(col => {
        const span = +((col.open.match(/span\s*(\d+)/) || col.cls.join(' ').match(/\bc(\d+)\b/) || [, 12])[1]);
        const w = unit * span + gut * (span - 1);
        const bl = blocks({ ...col, cls: col.cls.filter(c => !/^c\d+$/.test(c)) });
        return { w, bl, h: bl.reduce((a, x) => a + heightOf(x, w) + 10, 0) };
      });
      const rowH = Math.max(...heights.map(r => r.h));
      const avail = H - 56 - 40 - y;
      const y0 = y + Math.max(0, (avail - rowH) / 2); // rows are vertically centered like the CSS grid
      for (const r of heights) { bottom = Math.max(bottom, draw(slide, pptx, r.bl, x, y0 + (rowH - r.h) / 2, r.w)); x += r.w + gut; }
      y = bottom;
    } else if (b.head) {
      const w = Math.min(cw, b.size === 72 ? 18 * 72 * 0.62 : 22 * 48 * 0.62);
      y = draw(slide, pptx, [b], PAD, y, w);
    } else if (b.charSpacing) {
      slide.addText(b.text, { x: IN(PAD), y: IN(y), w: IN(cw), h: IN(20), fontFace: FONT, fontSize: PT(14), bold: true, color: C.muted, charSpacing: 1, margin: 0 });
      y += 32;
    } else {
      if (b.kind === 'list') y += 26;
      else if (b.color === C.muted && b.size === 24) y += 14;
      y = draw(slide, pptx, [b], PAD, y, Math.min(cw, b.kind === 'list' ? 40 * 24 * 0.55 + 28 : 40 * 24 * 0.55));
    }
  }
}

await pptx.writeFile({ fileName: out });
console.log(`wrote ${out}  (${sections.length} slides, notes kept)`);
