#!/usr/bin/env node
// Check a deck's cited numbers against its sources ledger.
// Usage: node check-sources.mjs deck.html research/deck-sources.md [--offline]
// Fails when a slide cites an id missing from the ledger, a URL does not load,
// or a VERIFIED quote is no longer on the page. PDFs and blocked pages are reported, not failed.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Text of a PDF via pdftotext (poppler), or null when it is not installed.
function pdfText(buf) {
  try {
    const f = join(mkdtempSync(join(tmpdir(), 'plinth-')), 'src.pdf');
    writeFileSync(f, buf);
    return execFileSync('pdftotext', ['-q', '-enc', 'UTF-8', f, '-'], { maxBuffer: 64 << 20 }).toString('utf8');
  } catch { return null; }
}

const [deckPath, ledgerPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const offline = process.argv.includes('--offline');
if (!deckPath || !ledgerPath) { console.error('usage: check-sources.mjs deck.html sources.md [--offline]'); process.exit(2); }

// Pages hide text behind HTML entities (&eacute;, &#243;) and JSON escapes ( ); decode both.
const ACC = { acute: '́', grave: '̀', circ: '̂', uml: '̈', tilde: '̃', cedil: '̧', ring: '̊' };
const decode = s => s
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-zA-Z])(acute|grave|circ|uml|tilde|cedil|ring);/g, (_, c, a) => c + ACC[a])
  .normalize('NFC');
const norm = s => decode(decode(s)).toLowerCase().replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;|[‘’]/g, "'")
  .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

// Ledger: markdown table rows whose first cell is an id (S1, T3, R12...). Columns are read by header name.
// A row may say "see T3" or "same as R1" instead of a URL; it then uses that row's URL.
const ID = /^[A-Z]{1,3}\d+$/;
const ledger = new Map();
let col = {};
for (const line of readFileSync(ledgerPath, 'utf8').split('\n')) {
  const cells = line.split('|').map(c => c.trim());
  if (/^id$/i.test(cells[1] || '')) { col = Object.fromEntries(cells.map((c, i) => [c.toLowerCase(), i])); continue; }
  if (!ID.test(cells[1] || '')) continue;
  const get = k => (col[k] !== undefined ? cells[col[k]] : '') || '';
  const urlCell = get('url') || cells.find(c => /https?:\/\//.test(c)) || '';
  const url = (urlCell.match(/https?:\/\/[^\s<>)|]+/) || [])[0] || '';
  const ref = !url && (urlCell.match(/(?:see|same as)\s+([A-Z]{1,3}\d+)/i) || [])[1];
  // Quote cell may hold "quoted text" plus a note; only the quoted parts are checked.
  const qcell = get('quote'), quoted = [...qcell.matchAll(/["“]([^"”]{4,})["”]/g)].map(m => m[1]);
  ledger.set(cells[1], { url, ref, quote: quoted.length ? quoted.join(' ... ') : qcell, status: get('status') });
}
for (const e of ledger.values()) if (!e.url && e.ref && ledger.get(e.ref)) e.url = ledger.get(e.ref).url;

// Deck: ids cited in each slide.
const html = readFileSync(deckPath, 'utf8');
const cited = new Map();
const noteGaps = [];
[...html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)].forEach(([, s], i) => {
  // Speaker notes are checked too: a number said aloud is still a claim. Notes citations show as "5n".
  const notes = (s.match(/<aside[\s\S]*?<\/aside>/gi) || []).join(' ');
  for (const [, id] of s.replace(/<aside[\s\S]*?<\/aside>/gi, '').matchAll(/\[([A-Z]{1,3}\d+)\]/g)) (cited.get(id) || cited.set(id, []).get(id)).push(i + 1);
  for (const [, id] of notes.matchAll(/\[([A-Z]{1,3}\d+)\]/g)) (cited.get(id) || cited.set(id, []).get(id)).push(`${i + 1}n`);
  if (/\d[\d.,]*\s?(%|persen|percent|por ciento|juta|miliar|triliun|million|billion|millones)/i.test(notes.replace(/<[^>]+>/g, ' ')) && !/\[[A-Z]{1,3}\d+\]/.test(notes) && !/our own|team plan|rencana (tim|kami)|rencana tarif|nuestro plan|plan propio/i.test(notes)) noteGaps.push(i + 1);
});

let fail = 0;
const out = (tag, id, msg) => { console.log(`${tag.padEnd(9)} ${id.padEnd(4)} ${msg}`); if (tag === 'FAIL') fail++; };
// A deck that shows numbers but cites nothing has skipped the research step.
if (!cited.size) { console.log('FAIL      no [id] citations in the deck. Research first: references/research.md'); fail++; }
for (const [id, slides] of cited) {
  const e = ledger.get(id);
  if (!e) { out('FAIL', id, `cited on slide ${slides.join(', ')} but missing from the ledger`); continue; }
  if (!e.url) { out('FAIL', id, 'ledger row has no URL'); continue; }
  if (offline) { out('OK', id, `slide ${slides.join(', ')} -> ${e.url}`); continue; }
  try {
    // Some government sites send an incomplete TLS chain that Node rejects but curl (system store) accepts.
    const r = await fetch(e.url, { headers: { 'user-agent': 'Mozilla/5.0 plinth-check-sources' }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
      .catch(err => {
        try {
          const body = execFileSync('curl', ['-sL', '--max-time', '30', '-A', 'Mozilla/5.0', e.url], { maxBuffer: 64 << 20 });
          if (!body.length) throw err;
          return new Response(body, { status: 200, headers: { 'content-type': body.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' : 'text/html' } });
        } catch { throw err; }
      });
    const type = r.headers.get('content-type') || '';
    if (!r.ok) { out(r.status === 403 || r.status === 429 ? 'BLOCKED' : 'FAIL', id, `HTTP ${r.status} ${e.url}`); continue; }
    let raw;
    if (type.includes('pdf') || /\.pdf($|\?)/i.test(e.url)) {
      raw = pdfText(Buffer.from(await r.arrayBuffer()));
      if (raw === null) { out('PDF', id, `loads; install pdftotext to check the quote: ${e.url}`); continue; }
    } else raw = await r.text();
    const page = norm(raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
    const q = norm(e.quote);
    // "part one" ... "part two": every fragment must be on the page.
    const flat = t => t.replace(/-\s+/g, '').replace(/[^a-z0-9%]+/g, ' ').trim();
    const pageFlat = flat(page);
    const parts = q.split(/\s*(?:\.\.\.|…)\s*/).map(p => p.replace(/^["']+|["']+$/g, '').trim()).filter(p => p.length > 3);
    if (!q) out('WARN', id, 'no quote in ledger');
    else if (parts.length && parts.every(p => page.includes(p) || pageFlat.includes(flat(p)))) out(/SECONDARY/i.test(e.status) ? 'OK-2ND' : 'OK', id, `quote found, slide ${slides.join(', ')}${/SECONDARY/i.test(e.status) ? ' (secondhand source)' : ''}`);
    else if (/SECONDARY/i.test(e.status)) out('WARN', id, `SECONDARY; quote not found verbatim at ${e.url}`);
    else out('FAIL', id, `quote not found on page: "${e.quote.slice(0, 60)}"`);
  } catch (err) { out('BLOCKED', id, `${err.name}: ${e.url}`); }
}
if (noteGaps.length) console.log(`
NOTES     speaker notes on slide ${noteGaps.join(', ')} say a number with no [id]; cite it or say where it comes from.`);
const unused = [...ledger.keys()].filter(k => !cited.has(k));
if (unused.length) console.log(`\nIn the ledger but not on a slide: ${unused.join(' ')}`);
console.log(`\n${cited.size} cited ids, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
