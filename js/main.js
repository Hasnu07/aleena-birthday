/* ===== Aleena's birthday site: main interactions ===== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- confetti ---------- */
  const cv = $('#confetti');
  const cx = cv.getContext('2d');
  let pieces = [];
  const COLORS = ['#ff8000', '#ffd166', '#ffffff', '#ff7aa2', '#e3b341', '#bff2dd', '#6a4bff'];
  function fit() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
  fit(); addEventListener('resize', fit);
  function burst(n = 160, x = innerWidth / 2, y = innerHeight * 0.35, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 9) * spread;
      pieces.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, g: .25 + Math.random() * .15, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, c: COLORS[(Math.random() * COLORS.length) | 0], life: 160 + Math.random() * 80 });
    }
    if (!raf) tick();
  }
  function rain(n = 120) {
    for (let i = 0; i < n; i++) pieces.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, g: .02, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .2, c: COLORS[(Math.random() * COLORS.length) | 0], life: 400 });
    if (!raf) tick();
  }
  let raf = 0;
  function tick() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    pieces = pieces.filter(p => p.life > 0 && p.y < innerHeight + 40);
    for (const p of pieces) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.life / 40);
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
    }
    raf = pieces.length ? requestAnimationFrame(tick) : 0;
  }
  window.ALEENA = { burst, rain };

  /* ---------- lights-out intro ---------- */
  const intro = $('#intro'), lights = $$('#lights span'), introText = $('#introText');
  document.body.classList.add('locked');
  let introDone = false;
  function endIntro() {
    if (introDone) return; introDone = true;
    intro.classList.add('out'); document.body.classList.remove('locked');
    if (!reduced) { burst(220, innerWidth / 2, innerHeight * 0.4, 1.3); setTimeout(() => rain(140), 300); }
    setTimeout(() => { intro.style.display = 'none'; }, 900);
  }
  $('#skipIntro').addEventListener('click', endIntro);
  if (reduced) endIntro();
  else {
    const lines = ['Starting grid: Aleena, P1', 'Jude in the midfield', 'Oscar on the front row', 'Engines on', 'Lights out and away we go'];
    lights.forEach((l, i) => setTimeout(() => { l.classList.add('on'); introText.textContent = lines[i]; }, 700 + i * 650));
    setTimeout(() => { lights.forEach(l => l.classList.remove('on')); introText.textContent = 'HAPPY BIRTHDAY ALEENA'; }, 700 + 5 * 650 + 500);
    setTimeout(endIntro, 700 + 5 * 650 + 1700);
  }

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#navToggle').addEventListener('click', () => nav.classList.toggle('open'));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  /* ---------- hero parallax stickers ---------- */
  const floaters = $$('.float-sticker');
  if (!reduced && matchMedia('(pointer:fine)').matches) {
    addEventListener('mousemove', e => {
      const dx = (e.clientX / innerWidth - .5), dy = (e.clientY / innerHeight - .5);
      floaters.forEach(f => { const d = +f.dataset.depth * 600; f.style.marginLeft = dx * d + 'px'; f.style.marginTop = dy * d + 'px'; });
    }, { passive: true });
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- 3D tilt on the driver card ---------- */
  const fut = $('.fut-card');
  if (fut && matchMedia('(pointer:fine)').matches && !reduced) {
    fut.addEventListener('mousemove', e => {
      const r = fut.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      fut.style.transform = `perspective(900px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.02)`;
    });
    fut.addEventListener('mouseleave', () => { fut.style.transform = ''; });
  }

  /* ---------- sticker click confetti ---------- */
  $$('.sticker').forEach(s => s.addEventListener('click', () => { const r = s.getBoundingClientRect(); burst(40, r.left + r.width / 2, r.top + r.height / 2, .6); }));

  /* ---------- lightbox ---------- */
  const figs = $$('#masonry figure'), lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let idx = 0;
  function show(i) {
    idx = (i + figs.length) % figs.length;
    const img = figs[idx].querySelector('img');
    lbImg.src = img.src; lbImg.alt = img.alt; lbCap.textContent = figs[idx].querySelector('figcaption').textContent;
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.classList.add('locked');
  }
  function hide() { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.classList.remove('locked'); }
  figs.forEach((f, i) => f.addEventListener('click', () => show(i)));
  $('#lbClose').addEventListener('click', hide);
  $('#lbPrev').addEventListener('click', () => show(idx - 1));
  $('#lbNext').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) hide(); });
  addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') hide(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
  let tx = 0; lb.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1)); });

  /* ---------- pause other videos when one plays ---------- */
  const vids = $$('.reel-row video');
  vids.forEach(v => v.addEventListener('play', () => vids.forEach(o => { if (o !== v) o.pause(); })));

  /* ---------- candles ---------- */
  const candles = $$('#candles button'), wish = $('#wishResult');
  const wishes = ['One down. Keep going.', 'Madrid win the league. Noted.', 'Oscar P1 in every race. Logged.', 'Mean mode stays, we like it.', 'All out. Make the real wish now.'];
  let out = 0;
  candles.forEach(c => c.addEventListener('click', () => {
    if (c.classList.contains('out')) return;
    c.classList.add('out'); out++;
    wish.textContent = wishes[out - 1];
    if (out === candles.length) { burst(260, innerWidth / 2, innerHeight * .5, 1.4); setTimeout(() => rain(160), 250); }
  }));
})();
