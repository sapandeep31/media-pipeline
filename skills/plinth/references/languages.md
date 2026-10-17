# Languages: pitching outside English

Write the deck in the language the judges or audience work in. If the event is international but the team is local, write slides in English and speak notes in whichever language the presenter is fluent in; a confident talk in plain English beats a scripted one in polished English.

The linter (`lint-core.js`) knows hype words for the languages below. It uses Unicode word boundaries for alphabetic scripts and plain substring matching for Chinese, Japanese and Korean, because those do not put spaces between words (or glue particles onto them). Headline length is counted in **words** for spaced scripts (12 max) and in **characters** for CJK (30 max); body density is 40 words or 100 CJK characters.

## General rules that change by language

- **Headline length.** 12 words fits English. German and Dutch compounds make fewer, longer words; aim for 8 to 10. Romance languages run 15 to 25% longer than English; cut, do not shrink the font. CJK: 15 to 25 characters is comfortable, 30 is the ceiling.
- **Numbers.** Use the audience's format on the slide and state the currency. Where decimal comma is standard, write 3,5% not 3.5%. Keep one format in the whole deck.
- **Register.** Formal languages (Japanese, Korean, German, Indonesian in government or campus contexts) need formal headlines, but formal is not the same as vague. A polite sentence with a number still beats a polite sentence without one.
- **Translated filler is still filler.** "Revolusioner", "innovador", "革新的" fail for the same reason "revolutionary" does: they claim a verdict instead of stating the fact.

## Per language

| Language | Register for pitches | Number format | Hype words the linter catches (examples) | Notes |
|---|---|---|---|---|
| Indonesian | Semi-formal: "kami", not "gue"; avoid stiff bureaucratic phrasing ("dalam rangka", "adapun") | Rp1,2 juta; 3,5%; thousands with a dot: 12.000 | revolusioner, canggih, terdepan, inovatif, memberdayakan, solusi terbaik, di era digital ini | "juta / miliar / triliun" read better than "M / B" for local judges. Campus defenses follow the pedoman's formal register. |
| Malay | Formal-neutral; Malaysian judges expect BM Standard, not Indonesian vocabulary | RM1.2 juta; 3.5% (decimal point in Malaysia) | memperkasakan, bertaraf dunia, terkini, penyelesaian terbaik | Watch false friends with Indonesian (e.g. "percuma" = free in BM). |
| Spanish | "Usted" for investors and government, "tú" acceptable for startup events in Latin America | 3,5 %; 1.200.000 (Spain); many Latin American markets use 1,200,000 and 3.5% | innovador, revolucionario, vanguardia, de última generación, disruptivo, empoderar | Spanish runs about 20% longer than English; cut words, do not shrink type. |
| Portuguese | "Você" in Brazil, "o senhor/a senhora" in formal Portugal | R$ 1,2 milhão; 3,5% | inovador, de ponta, de última geração, potencializar, disruptivo | Brazilian and European Portuguese differ in vocabulary; ask which audience. |
| French | "Vous" always on slides; understated tone reads as confident | 3,5 %; 1 200 000 (thin space); € after the number: 12 € | innovant, révolutionnaire, de pointe, incontournable, disruptif | French puts a space before : ; ? and %. |
| German | "Sie" for investors and corporates; "du" at many startup events; follow the host | 3,5 %; 1.200.000; 12 € | bahnbrechend, innovativ, nahtlos, ganzheitlich, zukunftsweisend | Precise and sourced beats enthusiastic; German audiences distrust superlatives. Compounds make headlines long: count characters, keep under ~70. |
| Italian | "Lei" formal; startup events often informal | 3,5%; 1.200.000 | innovativo, rivoluzionario, all'avanguardia, dirompente, di ultima generazione | Keep sentences short; Italian allows long subordinate chains that do not fit a slide. |
| Dutch | Direct and informal ("je/jij") is normal even with investors | 3,5%; 1.200.000; € 12 | baanbrekend, innovatief, naadloos, toonaangevend, revolutionair | Directness is expected; over-politeness reads as hiding something. |
| Turkish | "Siz" formal form | %3,5 (percent sign first); 1.200.000 TL | yenilikçi, çığır açan, son teknoloji, kusursuz, devrim niteliğinde | Percent sign goes before the number. |
| Vietnamese | Formal pronouns ("chúng tôi", "quý vị") | 3,5%; 1.200.000 đ | đột phá, cách mạng hóa, hàng đầu, tiên tiến nhất, liền mạch | Keep diacritics; a font without full Vietnamese support breaks the slide (Inter covers it). |
| Japanese | です/ます form; avoid casual endings on slides | 3.5%; 1,200万円 (man = 10,000 unit) | 革新的, 画期的, 最先端, 次世代, シームレス, 圧倒的 | Count characters: 15 to 25 per headline. Noun-ending headlines (体言止め) are normal and fine, as long as they carry the claim. Use 万 / 億 units, not "1.2M". |
| Chinese | Plain written Mandarin; avoid slogan style (四字成语 stacked) | 3.5%; 120万; 1.2亿 | 赋能, 颠覆, 革命性, 一站式, 无缝, 极致, 前沿 | Use 万/亿, not K/M. Match simplified vs traditional to the audience (mainland/Singapore vs Taiwan/Hong Kong). |
| Korean | 합니다 form on formal slides; 해요 at casual events | 3.5%; 120만 원; 1.2억 원 | 혁신적, 획기적, 최첨단, 차세대, 압도적, 시너지 | Korean uses spaces, but particles attach to words, so the linter matches substrings. Use 만/억 units. |
| Hindi | Formal "आप"; Hinglish is common and fine at startup events | 3.5%; ₹12 लाख; ₹1.2 करोड़; digit grouping 12,00,000 | क्रांतिकारी, अत्याधुनिक, अभूतपूर्व, विश्व स्तरीय, बेजोड़ | Use lakh/crore for Indian audiences; give USD alongside for international ones. |
| Arabic | Modern Standard Arabic on slides; dialect only in spoken notes | 3.5٪ or 3.5%; pick Arabic-Indic or Western digits and stay consistent | ثوري, مبتكر, متطور, غير مسبوق, رائد | Right-to-left: set `dir="rtl"` on the deck and mirror the layout (eyebrow and headline align right). The linter catches the forms with and without ال. |
| Russian | Formal "вы" | 3,5%; 1 200 000 ₽ (space as thousands separator) | революционный, инновационный, передовой, прорывной, бесшовный | Russian runs about 15% longer than English; cut. |

## Checking a translated deck

1. Lint the source language version first; fix it.
2. Translate the fixed version, not the original.
3. Lint again; translators often reintroduce filler ("innovative" is the easy word in every language).
4. Have a native speaker read the headlines only, out loud. If any sounds like an advertisement, rewrite it.
