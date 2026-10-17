#!/usr/bin/env node
// Usage: node lint-deck.mjs deck.html | slides.txt   [--json]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { lintSlides, parseText } = createRequire(import.meta.url)('./lint-core.js');

const file = process.argv[2];
if (!file) { console.error('usage: lint-deck.mjs <deck.html|slides.txt> [--json]'); process.exit(2); }
// Styles and scripts are not slides, even when a comment inside them shows example markup.
const raw = readFileSync(file, 'utf8').replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '');

const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').trim();
let slides;
if (/<section[\s>]/i.test(raw)) {
  slides = [...raw.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)].map(([, s]) => {
    // Notes are spoken, not shown; "specimen" blocks quote bad copy on purpose.
    s = s.replace(/<aside[\s\S]*?<\/aside>/gi, '').replace(/<div class="[^"]*specimen[^"]*">[\s\S]*?<\/div>/gi, '')
      // Phone mockups and positioning maps are pictures: their labels are not body copy.
      .replace(/<div class="phone[\s\S]*?<\/p>\s*<\/div>/gi, '').replace(/<div class="quad[\s\S]*?<\/span>\s*<\/div>/gi, '');
    const h = (s.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i) || s.match(/class="quote"[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '';
    const source = strip((s.match(/class="source"[^>]*>([\s\S]*?)<\//i) || [])[1] || '');
    const body = s.replace(/<h[12][^>]*>[\s\S]*?<\/h[12]>/i, '').replace(/class="(eyebrow|source|credit)"[^>]*>[\s\S]*?</gi, '><')
      .replace(/<li[^>]*>/gi, '\n- ');
    return { headline: strip(h), body: strip(body), source };
  });
} else slides = parseText(raw);

const r = lintSlides(slides);
// A deck of text blocks reads as AI-made. Data belongs in a chart, table or timeline the eye can compare.
// Components that carry evidence: a chart, table, timeline, diagram, product screen or photograph.
const CHART = /class="[^"]*\b(hbars|tl|flow|shot|frame|stat|cols|donut|iso|stack|layers|gantt|phones|phone|pic|bg|rings|quad)\b|<table|<svg|<img/i;
if (/<section[\s>]/i.test(raw) && slides.length >= 6) {
  const visual = [...raw.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)]
    .filter(([, s]) => CHART.test(s.replace(/<aside[\s\S]*?<\/aside>/gi, ''))).length;
  if (visual < 3) {
    r.issues.push({ slide: 0, kind: 'visual', msg: `Only ${visual} slide(s) show a chart, table, timeline, diagram or image. Chart at least three of the sourced numbers.`, cost: 6 });
    r.score = Math.max(0, r.score - Math.round(6 * 10 / Math.max(slides.length, 5)) * (3 - visual));
  }
  // Funded decks (Colosseum winners, Airbnb) have no slide that is only words: each carries a picture, chart, icon or product.
  // A brand slide (full-bleed colour with the logo) and a single quote slide count as pictures.
  const VIS = /class="[^"]*\b(hbars|tl|flow|shot|frame|stat|phone|phones|rings|quad|cards|ico|brand|logo|big|quote|cols|donut|iso|kpis|stack|layers|gantt|media|photo|pic)\b|<table|<svg|<img/i;
  [...raw.matchAll(/<section([^>]*)>([\s\S]*?)<\/section>/gi)].forEach(([, attrs, s], k) => {
    if (!VIS.test(attrs + s.replace(/<aside[\s\S]*?<\/aside>/gi, ''))) {
      r.issues.push({ slide: k + 1, kind: 'visual', msg: 'Text only. Add the chart, icon cards, product image or diagram that proves the headline.', cost: 2 });
      r.score = Math.max(0, r.score - Math.round(2 * 10 / Math.max(slides.length, 5)));
    }
  });
  // The last slide is what stays on screen during questions. A headline alone on it reads as a template.
  const secs = [...raw.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)].map(m => m[1].replace(/<aside[\s\S]*?<\/aside>/gi, ''));
  // GoTo, Grab and every Colosseum winner we read show real pictures: the product on a screen, the people it serves,
  // the place it works. Icons and charts alone are not enough; a deck needs at least two slides with a photo,
  // a product screenshot or the product running on a phone.
  const pics = secs.filter(s => /<img|class="[^"]*\b(phone|phones|pic|bg)\b/i.test(s)).length;
  if (pics < 2) {
    r.issues.push({ slide: 0, kind: 'visual', msg: `Only ${pics} slide(s) show a real picture. Add a photo of the people or place it serves (licensed, credited), a product screenshot, or the product on a phone.`, cost: 6 });
    r.score = Math.max(0, r.score - 4 * (2 - pics));
  }
  // A row of equal boxes (.cards, .flow) slide after slide is the clearest template tell (craft.md). GoTo and Grab
  // use one now and then; roadmaps are gantts, comparisons are tables, results are big numbers.
  const boxy = secs.map(s => /class="[^"]*\b(cards|flow)\b/i.test(s));
  boxy.forEach((b, k) => { if (b && boxy[k - 1]) {
    r.issues.push({ slide: k + 1, kind: 'visual', msg: `Slides ${k} and ${k + 1} are both rows of boxes. Show this one as a gantt, table, chart, big numbers or a picture.`, cost: 2 });
    r.score = Math.max(0, r.score - Math.round(2 * 10 / Math.max(slides.length, 5)));
  } });
  const nBoxy = boxy.filter(Boolean).length;
  if (nBoxy > Math.max(2, Math.floor(secs.length * 0.3))) {
    r.issues.push({ slide: 0, kind: 'visual', msg: `${nBoxy} of ${secs.length} slides are rows of boxes. Keep them to ${Math.max(2, Math.floor(secs.length * 0.3))}; turn the rest into gantts, tables, charts or big numbers.`, cost: 4 });
    r.score = Math.max(0, r.score - 4);
  }
  if (!CHART.test(secs[secs.length - 1])) {
    r.issues.push({ slide: secs.length, kind: 'visual', msg: 'Closing slide is text only. Show the ask as a timeline, table or flow: what it buys, by when.', cost: 4 });
    r.score = Math.max(0, r.score - Math.round(4 * 10 / Math.max(slides.length, 5)));
  }
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
console.log(`${file}\n${r.slides} slides  score ${r.score}/100\n`);
for (const i of r.issues) console.log(`  slide ${String(i.slide).padStart(2)}  ${i.kind.padEnd(9)} ${i.msg}`);
if (!r.issues.length) console.log('  no issues');
// A deck ships as a PDF or .pptx that nobody will edit by hand, so a placeholder is a hard stop at any score.
const holes = r.issues.filter(i => i.kind === 'unfinished');
if (holes.length) console.log(`\nNOT READY: ${holes.length} placeholder(s). Research each one or rewrite the slide so it states only what is known.`);
process.exit(r.score >= 90 && !holes.length ? 0 : 1);
