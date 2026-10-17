// Shared by lint-deck.mjs (Node) and the Plinth site (browser). No dependencies.
(function (root) {
  const FILLER = [
    'revolutioni[sz](?:e|es|ed|ing)', 'revolutionary', 'game[- ]chang(?:er|ing)', 'seamless(?:ly)?', 'cutting[- ]edge',
    'state[- ]of[- ]the[- ]art', 'next[- ]gen(?:eration)?', 'unlock(?:s|ing)?', 'unleash(?:es|ing)?',
    'empower(?:s|ing|ment)?', 'leverag(?:e|es|ing)', 'harness(?:es|ing)?', 'elevat(?:e|es|ing)', 'delv(?:e|es|ing)',
    'robust', 'holistic', 'synerg(?:y|ies)', 'paradigm', 'innovat(?:ive|ion)', 'world[- ]class', 'best[- ]in[- ]class',
    'transformative', 'supercharg(?:e|es|ing)', 'streamlin(?:e|es|ed|ing)', 'effortless(?:ly)?',
    "in today's fast[- ]paced world", "it's worth noting", 'furthermore', 'moreover', 'in conclusion',
    'at the end of the day', 'the future of \\w+', 'not just [\\w ]{1,30}? but',
    'merevolusi\\w*', 'revolusioner', 'mutakhir', 'memberdayakan', 'inovatif', 'solusi terdepan',
    'di era digital ini', 'tidak hanya [\\w ]{1,30}? tetapi juga', 'sinergi', 'holistik',
    // Indonesian (more)
    'terdepan', 'canggih', 'kelas dunia', 'tanpa hambatan', 'luar biasa', 'mengubah permainan', 'lebih lanjut',
    'kesimpulannya', 'era digital', 'solusi terbaik', 'mengoptimalkan',
    // Malay
    'terkini', 'bertaraf dunia', 'memperkasa(?:kan)?', 'penyelesaian terbaik', 'mengubah landskap', 'tambahan pula',
    // Spanish
    'revolucion(?:ar|ará|ando|ario|aria|arios|arias)', 'innovador(?:a|es|as)?', 'vanguardia', 'de última generación',
    'sin fisuras', 'disruptiv[oa]s?', 'potenciar', 'empoderar', 'sinergias?', 'de clase mundial', 'holístic[oa]s?',
    'cambia(?:r)? las reglas del juego', 'hoy en día', 'cabe destacar', 'en conclusión',
    // Portuguese
    'revolucion(?:ário|ária|ários|árias)', 'inovador(?:a|es|as)?', 'de ponta', 'de última geração', 'potencializar',
    'sem atrito', 'de classe mundial', 'vale ressaltar', 'em conclusão', 'hoje em dia',
    // French
    'révolutionn(?:er|e|ent|aire|aires)', 'innovant(?:e|s|es)?', 'de pointe', 'dernière génération', 'disruptif|disruptive',
    'synergies?', 'de classe mondiale', 'incontournable', 'holistique', 'il est important de noter', 'de nos jours',
    // German
    'revolution(?:är|äre|ären|ärer|ieren|iert)', 'bahnbrechend(?:e|en|er|es)?', 'innovativ(?:e|en|er|es)?',
    'nahtlos(?:e|en|er)?', 'hochmodern(?:e|en|er)?', 'ganzheitlich(?:e|en|er)?', 'synergien', 'weltklasse',
    'zukunftsweisend(?:e|en|er)?', 'disruptiv(?:e|en|er)?', 'last but not least',
    // Italian
    'rivoluzion(?:are|ario|aria|ari|arie)', 'innovativ[oaie]', "all'avanguardia", 'di ultima generazione',
    'senza soluzione di continuità', 'sinergi[ae]', 'olistic[oa]', 'di livello mondiale', 'dirompente', 'in conclusione',
    'vale la pena notare',
    // Dutch
    'revolutionair(?:e)?', 'baanbrekend(?:e)?', 'innovatie(?:f|ve)', 'naadlo(?:os|ze)', 'toonaangevend(?:e)?',
    'holistisch(?:e)?', 'wereldklasse', 'disruptie(?:f|ve)',
    // Turkish
    'devrim niteliğinde', 'çığır açan', 'yenilikçi', 'son teknoloji', 'kusursuz', 'sinerji', 'bütünsel',
    'dünya standartlarında', 'oyunun kurallarını değiştiren',
    // Vietnamese
    'cách mạng (?:hóa|hoá)', 'đột phá', 'tiên tiến nhất', 'hàng đầu', 'liền mạch', 'đẳng cấp thế giới', 'trao quyền',
    'tối ưu (?:hóa|hoá) toàn diện',
    // Hindi
    'क्रांतिकारी', 'अत्याधुनिक', 'अभूतपूर्व', 'विश्व स्तरीय', 'निर्बाध', 'गेम चेंजर', 'बेजोड़', 'सशक्त बनाना',
    // Arabic (optional definite article)
    '(?:ال)?ثوري(?:ة)?', '(?:ال)?مبتكر(?:ة)?', '(?:ال)?متطور(?:ة)?', 'غير مسبوق(?:ة)?', '(?:ال)?سلس(?:ة)?',
    'عالمي(?:ة)? المستوى', 'تآزر', '(?:ال)?رائد(?:ة)?',
    // Russian
    'революцион\\p{L}*', 'инновацион\\p{L}*', 'передов(?:ой|ая|ое|ые|ых|ым|ыми|ую)', 'бесшовн\\p{L}*', 'прорывн\\p{L}*', 'синерги\\p{L}*',
    'мирового уровня', 'не имеющ\\p{L}* аналогов'
  ];
  // Scripts without spaces between words (or with particles glued on) cannot use word boundaries: substring match.
  const FILLER_CJK = [
    // Japanese
    '革新的', '画期的', '最先端', 'シームレス', '次世代', 'ゲームチェンジャー', 'シナジー', '圧倒的', '世界最高水準', 'パラダイムシフト',
    // Chinese (simplified and traditional)
    '革命性', '颠覆', '顛覆', '赋能', '賦能', '无缝', '無縫', '前沿', '尖端', '一站式', '全方位', '极致', '極致', '世界一流', '降本增效',
    // Korean
    '혁신적', '획기적', '최첨단', '차세대', '원활한', '시너지', '게임 체인저', '패러다임', '압도적'
  ];
  // \b only knows ASCII letters; use Unicode letter/mark/number lookarounds so é, ç, Cyrillic, Devanagari, Arabic work.
  const B = '[\\p{L}\\p{M}\\p{N}_]';
  const FILLER_RE = new RegExp(`(?<!${B})(${FILLER.join('|')})(?!${B})|(${FILLER_CJK.join('|')})`, 'giu');
  const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  // Length of a line of text: characters for CJK (no spaces between words), words for everything else.
  const measure = s => CJK_RE.test(s)
    ? { n: (s.match(/[\p{L}\p{N}]/gu) || []).length, unit: 'characters' }
    : { n: s ? s.split(/\s+/).length : 0, unit: 'words' };
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu;
  const TOPIC_HEADLINES = /^(the )?(problem|solution|our solution|why us|market|team|traction|agenda|overview|introduction|thank you|questions\??|q&a|masalah|solusi|tim|pasar|terima kasih|problema|solución|solução|equipo|equipe|équipe|mercado|marché|lösung|markt|gracias|obrigado|merci|danke|问题|解决方案|团队|市场|謝謝|谢谢|課題|解決策|チーム|市場|ありがとうございました|문제|솔루션|팀|시장|감사합니다)$/iu;

  function lintSlides(slides) {
    // slides: [{ headline, body }]
    const issues = [];
    const add = (slide, kind, msg, cost) => issues.push({ slide, kind, msg, cost });
    slides.forEach((s, i) => {
      const n = i + 1, h = (s.headline || '').trim(), b = (s.body || '').trim(), all = h + ' ' + b;
      const hm = measure(h), bm = measure(b);
      const hMax = hm.unit === 'words' ? 12 : 30, bMax = bm.unit === 'words' ? 40 : 100;
      if (!h) add(n, 'headline', 'No headline. Every slide needs one claim.', 8);
      else if (TOPIC_HEADLINES.test(h.replace(/[.:：]$/, ''))) add(n, 'headline', `"${h}" is a topic label, not a claim. Put it in the eyebrow and write what is true.`, 6);
      if (hm.n > hMax) add(n, 'headline', `Headline has ${hm.n} ${hm.unit}. Keep it to ${hMax} or split the slide.`, 3);
      if (bm.n > bMax) add(n, 'density', `${bm.n} ${bm.unit} of body text. Aim for under ${bMax}; move the rest to speaker notes.`, 4);
      const bullets = (b.match(/(^|\n)\s*[-*•]/g) || []).length;
      if (bullets > 3) add(n, 'density', `${bullets} bullets. Three at most.`, 3);
      for (const m of all.matchAll(FILLER_RE)) add(n, 'voice', `"${m[0]}" is filler. Say the fact behind it.`, 4);
      if (EMOJI_RE.test(all)) add(n, 'voice', 'Emoji on a slide.', 3);
      EMOJI_RE.lastIndex = 0;
      if (/[!！]/.test(all)) add(n, 'voice', 'Exclamation mark. Let the claim carry the weight.', 2);
      // Names with digits glued to letters (Ed25519, SHA-256, Token-2022, H100) are identifiers, not data.
      const nums = all.replace(/\b[A-Za-z]+-?\d+[A-Za-z0-9-]*\b/g, '').match(/(\$|Rp|USD|IDR)?\s?\d[\d.,]*\s?(%|x|k|m|b|bn|juta|miliar|triliun)?/gi) || [];
      const hasBigNum = nums.some(x => /%|x|k|m|b|\$|Rp|juta|miliar|triliun/i.test(x) || x.replace(/\D/g, '').length >= 3);
      if (hasBigNum && !s.source && !/source|sumber|fuente|fonte|quelle|bron|kaynak|出典|来源|출처|\[source needed\]/i.test(all)) add(n, 'evidence', 'Number with no source line.', 3);
      // A deck ships as a PDF nobody edits by hand: any placeholder is unfinished work, and lint-deck exits non-zero on it.
      for (const m of (all + ' ' + (s.source || '')).matchAll(/\[(?:[^\]]*\b(?:needed|nama|name|tbd|todo|isi|placeholder|insert|xx+)\b[^\]]*)\]|\b(?:TBD|TODO|XXX|[Ll]orem ipsum)\b/g)) add(n, 'unfinished', `Placeholder ${m[0]} still on the slide. Research it, or rewrite the slide to say only what is known.`, 2);
    });
    const cost = issues.reduce((a, x) => a + x.cost, 0);
    const score = Math.max(0, Math.round(100 - cost * (10 / Math.max(slides.length, 5))));
    return { score, issues, slides: slides.length };
  }

  // Parse plain text: slides separated by a line of --- ; first line = headline; "source:" line = source.
  function parseText(text) {
    return text.split(/\n\s*---+\s*\n/).map(chunk => {
      const lines = chunk.trim().split('\n');
      const headline = (lines.shift() || '').replace(/^#+\s*/, '');
      const src = lines.findIndex(l => /^\s*(source|sumber|fuente|fonte|quelle|bron|kaynak|出典|来源|출처)\s*[:：]/i.test(l));
      const source = src >= 0 ? lines.splice(src, 1)[0] : '';
      return { headline, body: lines.join('\n'), source };
    }).filter(s => s.headline || s.body);
  }

  const api = { lintSlides, parseText, FILLER, FILLER_CJK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlinthLint = api;
})(typeof self !== 'undefined' ? self : this);
