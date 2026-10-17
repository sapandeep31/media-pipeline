// Build + QA for an HTML deck: per-slide PNGs, a contact sheet, layout checks, and a vector PDF.
// Usage: node tools/build.mjs [graphics/diagram-stage.html] [--out out/graphics] [--no-pdf] [--only 3,5]
// Each <section class="slide"> is one 1920x1080 stage. Use it to draw diagrams/graphics, then place the PNG in the PPTX.
// Uses the installed Edge through puppeteer-core (no browser download).
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const deck = resolve(args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'graphics/diagram-stage.html');
const out = resolve(opt('--out', 'out/graphics'));
const only = opt('--only', '')?.split(',').filter(Boolean).map(Number);
const noPdf = args.includes('--no-pdf');

const EDGE = [process.env.EDGE, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find((p) => p && existsSync(p));
if (!EDGE) { console.error('Edge not found; set EDGE=path\\to\\msedge.exe'); process.exit(2); }

const pngDir = join(out, 'png');
rmSync(pngDir, { recursive: true, force: true });
mkdirSync(pngDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true,
  args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const url = pathToFileURL(deck).href + '?print';
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => Promise.all([...document.images].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));

// ---- layout checks, run inside the page ----
const report = await page.evaluate(() => {
  const M = 96, MIN_FONT = 24, issues = [];
  const slides = [...document.querySelectorAll('.slide')];
  slides.forEach((s, i) => {
    const n = i + 1, sr = s.getBoundingClientRect(), bleed = s.classList.contains('bleed');
    const words = (s.innerText || '').split(/\s+/).filter(Boolean).length;
    if (words > 60) issues.push({ n, kind: 'density', msg: `${words} words (aim <= 40; split the slide)` });
    const title = s.querySelector('.title, h1, h2');
    if (!title) issues.push({ n, kind: 'title', msg: 'no .title / h1 / h2' });
    else {
      const tw = title.innerText.trim().split(/\s+/).length;
      if (title.classList.contains('title') && tw > 14) issues.push({ n, kind: 'title', msg: `title is ${tw} words (<= 12)` });
    }
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s.innerText)) issues.push({ n, kind: 'emoji', msg: 'emoji in slide text' });
    for (const el of s.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '');
      const hasText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      // clipped text
      if (hasText && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) && cs.overflow !== 'visible')
        issues.push({ n, kind: 'overflow', msg: `${tag} clips its text` });
      // off-stage
      if (r.right > sr.right + 1 || r.bottom > sr.bottom + 1 || r.left < sr.left - 1 || r.top < sr.top - 1) {
        if (!el.closest('.art, .fill, .scrim') && cs.position !== 'absolute')
          issues.push({ n, kind: 'offstage', msg: `${tag} leaves the 1920x1080 stage` });
      }
      if (hasText) {
        const fs = parseFloat(cs.fontSize);
        if (fs < MIN_FONT && !el.closest('.folio')) issues.push({ n, kind: 'font', msg: `${tag} text ${fs}px (< ${MIN_FONT}px)`, text: el.textContent.trim().slice(0, 40) });
        // margin: text must sit inside the 96px safe area
        if (!bleed && !el.closest('.folio')) {
          const range = document.createRange(); range.selectNodeContents(el); const tr = range.getBoundingClientRect();
          const T = 6; // line-box half-leading pokes a few px past the glyphs
          if (tr.width && (tr.left < sr.left + M - T || tr.right > sr.right - M + T || tr.top < sr.top + M - T || tr.bottom > sr.bottom - M + T))
            issues.push({ n, kind: 'margin', msg: `${tag} text crosses the ${M}px margin`, text: el.textContent.trim().slice(0, 40) });
        }
      }
    }
    for (const im of s.querySelectorAll('img')) if (!im.naturalWidth) issues.push({ n, kind: 'image', msg: `broken image ${im.getAttribute('src')}` });
  });
  return { count: slides.length, issues };
});

// ---- screenshots ----
const handles = await page.$$('.slide');
for (let i = 0; i < handles.length; i++) {
  if (only?.length && !only.includes(i + 1)) continue;
  await handles[i].screenshot({ path: join(pngDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
}

// ---- contact sheet (all slides at 480px wide) ----
const sheet = await browser.newPage();
const cols = 3, w = 480, h = 270, gap = 16;
const rows = Math.ceil(handles.length / cols);
await sheet.setViewport({ width: cols * (w + gap) + gap, height: rows * (h + gap + 28) + gap });
const cells = handles.map((_, i) => {
  const f = pathToFileURL(join(pngDir, `slide-${String(i + 1).padStart(2, '0')}.png`)).href;
  return `<figure><img src="${f}"><figcaption>${i + 1}</figcaption></figure>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;background:#02050b;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:${gap}px;padding:${gap}px;font:14px sans-serif;color:#9aa6b8}
  figure{margin:0}img{width:${w}px;height:${h}px;display:block;outline:1px solid #1e2a40}figcaption{padding-top:6px}</style>${cells}`, { waitUntil: 'load' });
if (!only?.length) await sheet.screenshot({ path: join(out, 'contact-sheet.png'), fullPage: true });

// ---- vector PDF ----
if (!noPdf) {
  const pdf = join(out, 'stage.pdf');
  await page.emulateMediaType('print');
  await page.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  console.log(`pdf    ${pdf} (${(statSync(pdf).size / 1024 / 1024).toFixed(2)} MB)`);
}
await browser.close();

console.log(`slides ${report.count}  ->  ${pngDir}`);
if (!only?.length) console.log(`sheet  ${join(out, 'contact-sheet.png')}`);
if (!report.issues.length) console.log('checks OK: no overflow, off-stage, margin, font-size, density, emoji or image issues');
else {
  console.log(`checks ${report.issues.length} issue(s):`);
  for (const x of report.issues) console.log(`  slide ${x.n}  ${x.kind.padEnd(8)} ${x.msg}${x.text ? `  "${x.text}"` : ''}`);
  process.exitCode = 1;
}
