/* ===== fun.js: memes, translator, coupons, scanner, penalties, notifications ===== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pick = a => a[(Math.random() * a.length) | 0];
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  const party = (...a) => window.ALEENA && window.ALEENA.burst(...a);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- joke notifications ---------- */
  const toastBox = $('#toasts');
  const queue = []; let showing = false;
  function toast(icon, title, text) { queue.push([icon, title, text]); if (!showing) nextToast(); }
  function nextToast() {
    const t = queue.shift(); if (!t) { showing = false; return; }
    showing = true;
    const el = document.createElement('div'); el.className = 'toast';
    const i = document.createElement('i'); i.textContent = t[0];
    const body = document.createElement('div'); const b = document.createElement('b'); b.textContent = t[1]; const s = document.createElement('span'); s.textContent = t[2]; body.append(b, s);
    const when = document.createElement('small'); when.textContent = 'now';
    el.append(i, body, when); toastBox.append(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    let gone = false;
    const close = () => { if (gone) return; gone = true; el.classList.remove('show'); setTimeout(() => { el.remove(); nextToast(); }, 450); };
    el.addEventListener('click', close); setTimeout(close, 4600);
  }
  const sectionToasts = {
    card: ['🔋', 'Mean Mode', 'Battery at 100%. Fully charged for the birthday.'],
    translate: ['💬', 'Group chat', 'Aleena is typing a paragraph…'],
    jude: ['⚽', 'Madrid HQ', 'Contract offer: lifetime deal, paid in jerseys.'],
    oscar: ['🏎️', 'Team radio', '"Happy birthday." "Yep."'],
    memes: ['📊', 'Screen Time', '6h football edits, 4h F1 onboards. Productive.'],
    coupons: ['🏦', 'Bank of Aleena', 'Six coupons deposited. Spend them irresponsibly.'],
    letter: ['📅', 'Calendar', 'Today: be nice to Aleena. Mandatory. All day.']
  };
  const seen = new Set();
  const toastIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || seen.has(e.target.id) || document.body.classList.contains('racing')) return;
    seen.add(e.target.id); toast(...sectionToasts[e.target.id]);
  }), { threshold: .3 });
  Object.keys(sectionToasts).forEach(id => { const el = document.getElementById(id); el && toastIO.observe(el); });
  setTimeout(() => { if (scrollY < 200) toast('🎂', 'Reminder', 'It is Aleena\'s birthday. Yes, she already told everyone.'); }, 8500);

  /* ---------- tab bar scroll spy ---------- */
  const tabs = $$('#tabbar a');
  const targets = tabs.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  function spy() {
    const y = scrollY + innerHeight * .4; let cur = 0;
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top + scrollY <= y) cur = i; });
    tabs.forEach((a, i) => a.classList.toggle('on', i === cur));
  }
  addEventListener('scroll', spy, { passive: true }); spy();
  tabs.forEach(a => a.addEventListener('click', () => buzz(8)));

  /* ---------- mean mode scanner ---------- */
  const pad = $('#scanPad'), res = $('#scanResult');
  if (pad) {
    const results = [
      ['3% MEAN', 'Suspiciously nice. Check if she wants something.'],
      ['47% MEAN', 'Has not eaten. Approach with snacks, palms visible.'],
      ['92% MEAN', 'Madrid conceded recently. Evacuate the area.'],
      ['0% MEAN', 'Birthday mode detected. Enjoy it while it lasts.'],
      ['ERROR', 'Sass overflow. The sensor rolled its eyes back at us.'],
      ['64% MEAN', 'Someone said "calm down". Pray for them.'],
      ['12% MEAN', '88% angel. The remaining 12% is doing all the talking.'],
      ['100% SOFT', 'She is being nice on purpose. Screenshot this.']
    ];
    let t0 = 0, raf = 0, last = -1;
    const setRes = (a, b) => { res.querySelector('b').textContent = a; res.querySelector('span').textContent = b; };
    function frame() {
      const p = Math.min(100, (performance.now() - t0) / 16);
      pad.style.setProperty('--p', p);
      if (p >= 100) { done(); return; }
      if ((p | 0) % 20 === 0) buzz(6);
      setRes('SCANNING', ['Reading thumb…', 'Measuring sass…', 'Checking hunger levels…', 'Consulting Jude…', 'Almost there…'][Math.min(4, (p / 20) | 0)]);
      raf = requestAnimationFrame(frame);
    }
    function done() {
      pad.classList.remove('scanning'); raf = 0; t0 = 0;
      let i; do { i = (Math.random() * results.length) | 0; } while (i === last); last = i;
      setRes(...results[i]); buzz([30, 40, 60]);
      const r = pad.getBoundingClientRect(); party(50, r.left + r.width / 2, r.top + r.height / 2, .7);
    }
    const start = e => { e.preventDefault(); if (raf) return; t0 = performance.now(); pad.classList.add('scanning'); raf = requestAnimationFrame(frame); };
    const stop = () => { if (!raf) return; cancelAnimationFrame(raf); raf = 0; pad.classList.remove('scanning'); pad.style.setProperty('--p', 0); setRes('TOO FAST', 'Thumb removed. She noticed. Hold it properly.'); };
    pad.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => pad.addEventListener(ev, stop));
    pad.addEventListener('contextmenu', e => e.preventDefault());
    pad.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !raf) { t0 = performance.now() - 1500; pad.classList.add('scanning'); raf = requestAnimationFrame(frame); } });
  }

  /* ---------- translator ---------- */
  const flips = [
    ['"I\'m fine."', 'You have ten seconds to work out what you did.'],
    ['"Do whatever you want."', 'Do not, under any circumstances, do whatever you want.'],
    ['"I\'m not hungry."', 'I will be eating half of yours.'],
    ['"Five minutes."', 'Somewhere between 25 and 90 minutes.'],
    ['"I\'m not mad."', 'I am drafting a paragraph. It has bullet points.'],
    ['"K."', 'War.'],
    ['"It\'s just a game."', 'Phrase not found. She has never said this.'],
    ['"Oscar deserved that."', 'Oscar deserved that. No translation needed.']
  ];
  const fg = $('#flipGrid');
  if (fg) flips.forEach(([a, b]) => {
    const btn = document.createElement('button'); btn.className = 'flip'; btn.type = 'button';
    const inner = document.createElement('span'); inner.className = 'flip-inner';
    const f = document.createElement('span'); f.className = 'flip-front'; const fs = document.createElement('small'); fs.textContent = 'She says'; f.append(fs, a);
    const k = document.createElement('span'); k.className = 'flip-back'; const ks = document.createElement('small'); ks.textContent = 'She means'; k.append(ks, b);
    inner.append(f, k); btn.append(inner);
    btn.addEventListener('click', () => { btn.classList.toggle('on'); buzz(10); });
    fg.append(btn);
  });

  /* ---------- coupons ---------- */
  const coupons = [
    ['🏆', 'One argument, won', 'No evidence required. Opponent must say "you were right".'],
    ['🤫', 'Total silence', 'One full Madrid match where nobody else speaks.'],
    ['😈', 'Mean mode pass', '24 hours, zero consequences. Use wisely. Or do not.'],
    ['🍟', 'Free fries tax', 'Take food from any plate. Nobody may say "you said you weren\'t hungry".'],
    ['📣', 'Unlimited "told you so"', 'Valid all day. Stackable with the argument coupon.'],
    ['🍿', 'Race day snacks', 'You choose them. Somebody else pays. Papaya dress code.']
  ];
  const cg = $('#couponGrid'); const used = new Set(store.get('aleena-coupons', []));
  if (cg) coupons.forEach(([ic, title, sub], i) => {
    const b = document.createElement('button'); b.className = 'coupon' + (used.has(i) ? ' used' : ''); b.type = 'button';
    const icon = document.createElement('i'); icon.textContent = ic;
    const d = document.createElement('div'); const t = document.createElement('b'); t.textContent = title; const s = document.createElement('span'); s.textContent = sub; d.append(t, s);
    const st = document.createElement('em'); st.textContent = 'REDEEMED';
    b.append(icon, d, st);
    b.addEventListener('click', () => {
      if (b.classList.contains('used')) { b.classList.remove('used'); used.delete(i); store.set('aleena-coupons', [...used]); return; }
      b.classList.add('used'); used.add(i); store.set('aleena-coupons', [...used]); buzz([20, 30, 40]);
      const r = b.getBoundingClientRect(); party(70, r.left + r.width / 2, r.top + r.height / 2, .8);
      toast('🎟️', 'Coupon redeemed', 'Screenshot it and send it to whoever owes you.');
    });
    cg.append(b);
  });

  /* ---------- meme archive ---------- */
  const rail = $('#memeRail'), N = 14;
  if (rail) {
    const order = [...Array(N).keys()];
    const HEIGHTS = [1308, 1308, 1308, 1350, 1387, 1350, 1387, 1350, 1387, 1308, 1350, 1387, 1387, 1308];
    const memes = order.map(i => {
      const b = document.createElement('button'); b.className = 'meme'; b.type = 'button';
      const img = document.createElement('img'); img.loading = 'lazy'; img.alt = 'Aleena meme ' + (i + 1);
      img.width = 1080; img.height = HEIGHTS[i];
      img.src = 'assets/memes/m' + String(i + 1).padStart(2, '0') + '.jpg';
      b.append(img);
      b.addEventListener('click', e => {
        const r = b.getBoundingClientRect(); const s = document.createElement('span'); s.className = 'lol'; s.textContent = pick(['😂', '💀', '😭', '🤣', '🫠']);
        s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px'; b.append(s); setTimeout(() => s.remove(), 900); buzz(8);
      });
      rail.append(b); return b;
    });
    const count = $('#memeCount'); let cur = 0;
    function current() {
      const mid = rail.getBoundingClientRect().left + rail.clientWidth / 2; let best = 0, bd = 1e9;
      memes.forEach((m, i) => { const r = m.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      cur = best; count.textContent = (best + 1) + ' / ' + N;
    }
    rail.addEventListener('scroll', () => requestAnimationFrame(current), { passive: true }); current();
    const go = i => { const m = memes[i]; rail.scrollTo({ left: m.offsetLeft - (rail.clientWidth - m.offsetWidth) / 2, behavior: 'smooth' }); };
    $('#memeShuffle').addEventListener('click', () => { let i; do { i = (Math.random() * N) | 0; } while (i === cur); go(i); buzz(10); });
    $('#memeShare').addEventListener('click', async () => {
      const src = memes[cur].querySelector('img').src;
      try {
        const blob = await (await fetch(src)).blob();
        const file = new File([blob], 'aleena-meme-' + (cur + 1) + '.jpg', { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Aleena meme' }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = src; a.download = 'aleena-meme-' + (cur + 1) + '.jpg'; document.body.append(a); a.click(); a.remove();
    });
  }

  /* ---------- penalty shootout ---------- */
  const field = $('#penField');
  if (field) {
    const goal = $('#penGoal'), zones = $('#penZones'), keeper = $('#penKeeper'), ball = $('#penBall'), msg = $('#penMsg'), dots = $('#penDots'), score = $('#penScore'), again = $('#penReset'), flash = $('#penFlash');
    const SHOTS = 5; let shot = 0, goals = 0, busy = false;
    const GOAL = ['GOAL. Top bins. The cat is filing a complaint.', 'GOAL. Jude would have clapped.', 'GOAL. The cat dived the wrong way and is pretending it was tactical.', 'GOAL. The Bernabéu is shaking.', 'GOAL. Cold. Oscar levels of cold.', 'GOAL. The cat has asked to be substituted.'];
    const SAVE = ['SAVED. By a cat. We will not be discussing this.', 'SAVED. Mean mode is authorised.', 'SAVED. The cat read your mind. Rude.', 'SAVED. He has nine lives and apparently nine hands.'];
    const POST = ['OFF THE POST. The post supports Barcelona.', 'OFF THE BAR. The woodwork has been reported to FIFA.'];
    for (let i = 0; i < 6; i++) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', ['Top left', 'Top middle', 'Top right', 'Bottom left', 'Bottom middle', 'Bottom right'][i]); b.addEventListener('click', () => shoot(i)); zones.append(b); }
    function drawDots(results) { dots.textContent = ''; for (let i = 0; i < SHOTS; i++) { const d = document.createElement('i'); if (results[i] === 1) d.className = 'g'; if (results[i] === 0) d.className = 'm'; dots.append(d); } }
    let results = []; drawDots(results);
    function say(t, cls) { msg.textContent = t; msg.className = 'pen-msg ' + (cls || ''); }
    function pop(t, color) { flash.textContent = t; flash.style.color = color; flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show'); }
    function shoot(z) {
      if (busy || shot >= SHOTS) return; busy = true; field.classList.add('busy');
      const col = z % 3, row = (z / 3) | 0;
      const kc = (Math.random() * 3) | 0, kr = (Math.random() * 2) | 0;
      const post = Math.random() < .07;
      const saved = !post && kc === col && (kr === row || Math.random() < .3);
      const g = goal.getBoundingClientRect(), b = ball.getBoundingClientRect();
      // ball flight
      let tx = g.left + g.width * (col + .5) / 3, ty = g.top + g.height * (row + .5) / 2;
      if (post) { tx = col === 0 ? g.left - 2 : col === 2 ? g.right + 2 : tx; ty = col === 1 ? g.top - 4 : ty; }
      ball.style.transform = `translate(${tx - (b.left + b.width / 2)}px,${ty - (b.top + b.height / 2)}px) scale(.55) rotate(540deg)`;
      // keeper dive
      keeper.style.transform = `translate(${(kc - 1) * g.width * .31}px,${kr === 0 ? -g.height * .3 : 0}px) rotate(${(kc - 1) * 38}deg)`;
      buzz(12);
      setTimeout(() => {
        if (post) { results.push(0); say(pick(POST), 'miss'); pop('POST!', '#ffd0d0'); buzz(80); }
        else if (saved) { results.push(0); say(pick(SAVE), 'miss'); pop('SAVED', '#ffd0d0'); buzz([60, 40, 60]); ball.style.transform += ' translateY(40px)'; }
        else { results.push(1); goals++; say(pick(GOAL), 'goal'); pop('GOAL!', '#fff7c2'); buzz([20, 30, 20, 30, 80]); party(60, g.left + g.width / 2, g.top + g.height / 2, .8); }
        shot++; drawDots(results); score.textContent = goals + ' / ' + SHOTS;
      }, 520);
      setTimeout(() => {
        ball.style.transition = 'none'; ball.style.transform = ''; void ball.offsetWidth; ball.style.transition = '';
        keeper.style.transform = '';
        busy = false; field.classList.remove('busy');
        if (shot >= SHOTS) end();
      }, 1650);
    }
    function end() {
      field.classList.add('over'); again.hidden = false;
      const best = Math.max(goals, store.get('aleena-pens', 0)); store.set('aleena-pens', best);
      if (goals === SHOTS) { say('5 / 5. Sign her. Florentino is already on the banana phone.', 'goal'); party(260, innerWidth / 2, innerHeight * .45, 1.3); window.ALEENA && setTimeout(() => window.ALEENA.rain(150), 250); }
      else if (goals >= 3) { say(goals + ' / 5. Madrid win the shootout. The cat wants a rematch.', 'goal'); party(120); }
      else say(goals + ' / 5. VAR checked it. It was the cat\'s fault. Go again.', 'miss');
    }
    again.addEventListener('click', () => { shot = 0; goals = 0; results = []; drawDots(results); score.textContent = '0 / ' + SHOTS; again.hidden = true; field.classList.remove('over'); say('Tap a target. The cat is ready. The cat is always ready.'); });
    window.__PEN = { shoot, state: () => ({ shot, goals, busy }) };
  }
})();
