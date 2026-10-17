// Viewer: scroll view by default, F = present mode (arrows/space/PageUp/PageDown), Esc = back.
// ?print stacks slides at 100% for the build script and PDF export.
(() => {
  const qs = new URLSearchParams(location.search);
  const slides = [...document.querySelectorAll('.slide')];
  slides.forEach((s, i) => { const f = s.querySelector('.folio .n'); if (f) f.textContent = `${i + 1} / ${slides.length}`; });
  if (qs.has('print')) { document.body.classList.add('print'); return; }

  const fitScroll = () => document.documentElement.style.setProperty('--zoom', Math.min(1, (innerWidth - 80) / 1920));
  const fitPresent = () => document.documentElement.style.setProperty('--fit', Math.min(innerWidth / 1920, innerHeight / 1080));
  let cur = 0;
  const show = (i) => { cur = Math.max(0, Math.min(slides.length - 1, i)); slides.forEach((s, j) => s.classList.toggle('on', j === cur)); };
  addEventListener('resize', () => { fitScroll(); fitPresent(); });
  addEventListener('keydown', (e) => {
    const present = document.body.classList.contains('present');
    if (e.key === 'f' || e.key === 'F') { document.body.classList.toggle('present'); fitPresent(); show(cur); }
    else if (e.key === 'Escape') document.body.classList.remove('present');
    else if (present && ['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) show(cur + 1);
    else if (present && ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) show(cur - 1);
  });
  fitScroll(); fitPresent(); show(0);
})();
