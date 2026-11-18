/* ===== heroes.js: quiz, shield throw, spidey-sense, post-credits ===== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const pick = a => a[(Math.random() * a.length) | 0];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  const party = (...a) => window.ALEENA && window.ALEENA.burst(...a);
  const toast = (...a) => window.ALEENA && window.ALEENA.toast && window.ALEENA.toast(...a);
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- section notifications ---------- */
  const notes = {
    heroes: ['🗞️', 'Daily Bugle', 'SPIDER-ALEENA: MENACE OR BIRTHDAY GIRL? We investigate.'],
    blast: ['🕶️', 'Director Fury', 'Aleena. Answer your banana phone. It is urgent.']
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && notes[e.target.id]) { toast(...notes[e.target.id]); delete notes[e.target.id]; io.unobserve(e.target); } }), { threshold: .25 });
  Object.keys(notes).forEach(id => { const el = document.getElementById(id); el && io.observe(el); });

  /* ---------- which hero are you today ---------- */
  const quiz = $('#quiz');
  if (quiz) {
    const HEROES = {
      captain: ['Captain Aleena', 'assets/stickers/hero-captain.png', 'You can do this all day. Arguing, mostly. Honourable, stubborn, and somehow always first to the snacks.'],
      spider: ['Spider-Aleena', 'assets/stickers/hero-spider.png', 'Friendly, funny, slightly late. Your spidey-sense is 100% dedicated to protecting your food.'],
      wonder: ['Wonder Aleena', 'assets/stickers/hero-wonder.png', 'Royalty. You do not ask people to admit you were right. The lasso does that for you.'],
      bat: ['Bat-Aleena', 'assets/stickers/hero-bat.png', 'You are the night. You are also not to be spoken to before coffee. Vengeance can wait until noon.']
    };
    const QS = [
      ['Someone takes a fry from your plate. You:', [['Throw the shield. It comes back. So does the fry.', 'captain'], ['Already knew. The plate moved two seconds ago.', 'spider'], ['Make them confess. Slowly. With the lasso.', 'wonder'], ['Say nothing. Remember forever.', 'bat']]],
      ['It is 7 AM. You are:', [['Up. Ran 10k. Annoying about it.', 'captain'], ['Late. Swinging in with an excuse.', 'spider'], ['Awake, glowing, tiara already on.', 'wonder'], ['The night. Go away.', 'bat']]],
      ['Madrid concede in the 90th minute. You:', [['Stand up. "I can do this all day." Sit back down.', 'captain'], ['Climb the wall. Literally.', 'spider'], ['Demand the truth from the referee.', 'wonder'], ['Brood on the nearest rooftop.', 'bat']]],
      ['Your ideal birthday:', [['Assemble everyone. Give a speech nobody asked for.', 'captain'], ['Everyone you like, one room, pizza.', 'spider'], ['A feast. In your honour. As is correct.', 'wonder'], ['Nobody sings. Cake arrives silently.', 'bat']]]
    ];
    const qEl = $('#quizQ'), opts = $('#quizOpts'), bar = $('#quizBar'), res = $('#quizResult');
    let step = 0, tally = {};
    function show() {
      bar.style.width = (step / QS.length * 100) + '%';
      if (step >= QS.length) return finish();
      const [q, answers] = QS[step]; qEl.textContent = q; opts.textContent = '';
      answers.forEach(([text, hero]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
        b.addEventListener('click', () => { tally[hero] = (tally[hero] || 0) + 1; step++; buzz(10); show(); });
        opts.append(b);
      });
    }
    function finish() {
      const key = Object.keys(HEROES).reduce((a, b) => (tally[b] || 0) > (tally[a] || 0) ? b : a);
      const [name, img, text] = HEROES[key];
      qEl.hidden = true; opts.hidden = true; res.hidden = false;
      $('#quizName').textContent = name; $('#quizImg').src = img; $('#quizImg').alt = name; $('#quizText').textContent = text;
      const r = quiz.getBoundingClientRect(); party(90, r.left + r.width / 2, r.top + r.height / 2, .9); buzz([30, 40, 80]);
    }
    $('#quizAgain').addEventListener('click', () => { step = 0; tally = {}; qEl.hidden = false; opts.hidden = false; res.hidden = true; show(); });
    show();
    window.__QUIZ = { answer: i => opts.children[i] && opts.children[i].click(), state: () => ({ step, tally, done: !res.hidden, name: $('#quizName').textContent }) };
  }

  /* ---------- shield throw ---------- */
  const arena = $('#blastArena');
  if (arena) {
    const FOES = [['👾', 'Monday'], ['⏰', '7 AM alarm'], ['🤖', 'VAR'], ['👹', 'Spoilers'], ['🦹', '"Calm down"'], ['👽', 'Slow WiFi'], ['🪫', 'Low battery'], ['😈', 'Lando fans'], ['🧟', 'Cold fries'], ['👻', '"It\'s just a game"'], ['🛸', 'Group projects']];
    const FRIENDS = [['🎂', 'Cake', 'That was the cake. THE CAKE.'], ['⚽', 'Jude', 'You shielded Jude. Apologise.'], ['🏎️', 'Oscar', 'Oscar did nothing wrong. He never does.']];
    const TIME = 30;
    const overlay = $('#blastOverlay'), title = $('#blastTitle'), text = $('#blastText'), startBtn = $('#blastStart'), hero = $('#blastHero'), shield = $('#blastShield');
    const scoreEl = $('#blastScore'), comboEl = $('#blastCombo'), bestEl = $('#blastBest'), timeEl = $('#blastTime'), msg = $('#blastMsg');
    let running = false, score = 0, combo = 0, left = TIME, spawnT = 0, clockT = 0, best = store.get('aleena-shield', 0);
    bestEl.textContent = best;
    const mult = () => Math.min(5, 1 + ((combo / 5) | 0));
    function paint() { scoreEl.textContent = score; comboEl.textContent = 'x' + mult(); timeEl.style.width = Math.max(0, left / TIME * 100) + '%'; }
    function say(t) { msg.textContent = t; }

    function spawn() {
      if (!running) return;
      const friend = Math.random() < .2;
      const [icon, label, oops] = friend ? pick(FRIENDS) : pick(FOES);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'foe' + (friend ? ' friend' : '');
      const i = document.createElement('i'); i.textContent = icon; const s = document.createElement('span'); s.textContent = label; b.append(i, s);
      const prog = 1 - left / TIME;
      b.style.left = rnd(4, 74) + '%'; b.style.setProperty('--dur', (4.3 - prog * 1.6 + rnd(-.3, .3)).toFixed(2) + 's'); b.style.setProperty('--drop', (arena.clientHeight + 90) + 'px');
      b.addEventListener('pointerdown', e => { e.preventDefault(); hit(b, friend, label, oops); });
      b.addEventListener('animationend', e => {
        if (e.animationName !== 'foeFall') return;
        if (running && !friend && !b.dead) { combo = 0; paint(); say(label + ' got through. Regroup.'); }
        b.remove();
      });
      arena.append(b);
      spawnT = setTimeout(spawn, 760 - prog * 380 + rnd(-90, 90));
    }

    function hit(b, friend, label, oops) {
      if (!running || b.dead) return; b.dead = true;
      const a = arena.getBoundingClientRect(), r = b.getBoundingClientRect(), h = hero.getBoundingClientRect();
      const tx = r.left + r.width / 2 - a.left, ty = r.top + r.height / 2 - a.top, hx = h.left + h.width / 2 - a.left, hy = h.top + h.height * .35 - a.top;
      // throw the shield
      shield.className = 'blast-shield'; shield.style.transform = `translate(${hx}px,${hy}px)`; void shield.offsetWidth;
      shield.classList.add('fly'); shield.style.transform = `translate(${tx}px,${ty}px) rotate(540deg)`;
      hero.classList.add('fire'); setTimeout(() => hero.classList.remove('fire'), 130);
      setTimeout(() => { shield.className = 'blast-shield back'; shield.style.transform = `translate(${hx}px,${hy}px) rotate(1080deg)`; }, 170);
      // freeze the target where it is, then pop it
      b.style.top = (r.top - a.top) + 'px'; b.style.pointerEvents = 'none';
      setTimeout(() => { b.classList.add('hit'); setTimeout(() => b.remove(), 300); }, 120);
      let pts;
      if (friend) { pts = -3; score = Math.max(0, score - 3); combo = 0; say(oops); buzz([80, 40, 80]); }
      else { combo++; pts = mult(); score += pts; say(label + ': eliminated.' + (combo && combo % 5 === 0 ? ' Combo x' + mult() + '!' : '')); buzz(12); }
      const p = document.createElement('span'); p.className = 'blast-pts' + (friend ? ' bad' : ''); p.textContent = (pts > 0 ? '+' : '') + pts; p.style.left = tx + 'px'; p.style.top = ty + 'px'; arena.append(p); setTimeout(() => p.remove(), 700);
      paint();
    }

    function start() {
      if (running) return;
      arena.querySelectorAll('.foe,.blast-pts').forEach(e => e.remove());
      running = true; score = 0; combo = 0; left = TIME; paint(); overlay.classList.add('hidden'); say('Avengers, assemble.');
      clearInterval(clockT); clockT = setInterval(() => { left -= .1; paint(); if (left <= 0) end(); }, 100);
      spawn();
    }
    function end() {
      running = false; clearInterval(clockT); clearTimeout(spawnT);
      arena.querySelectorAll('.foe').forEach(e => { e.style.pointerEvents = 'none'; e.classList.add('hit'); setTimeout(() => e.remove(), 300); });
      if (score > best) { best = score; store.set('aleena-shield', best); bestEl.textContent = best; }
      if (score >= 28) { title.textContent = score + ' points. Worthy.'; text.textContent = 'The universe is safe. Mondays are not. You really can do this all day.'; party(240, innerWidth / 2, innerHeight * .45, 1.3); }
      else if (score >= 12) { title.textContent = score + ' points. Certified Avenger.'; text.textContent = 'Director Fury nodded once. From him, that is a standing ovation.'; party(110); }
      else { title.textContent = score + ' points. S.H.I.E.L.D. intern.'; text.textContent = 'Agent Coulson is not angry, just disappointed. Go again.'; }
      startBtn.textContent = 'Throw again'; overlay.classList.remove('hidden'); say('Time. Shield returned to sender.'); buzz([40, 60, 160]);
    }
    startBtn.addEventListener('click', start);
    window.__SHIELD = { start, end, state: () => ({ running, score, combo, left: +left.toFixed(1), foes: arena.querySelectorAll('.foe').length }), hitFirst(friendToo) { const f = [...arena.querySelectorAll('.foe')].find(e => !e.dead && (friendToo || !e.classList.contains('friend'))); if (f) f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); return !!f; } };
  }

  /* ---------- spidey-sense reflex test ---------- */
  const pad = $('#sensePad');
  if (pad) {
    const label = $('#senseText'), out = $('#senseResult');
    let state = 'idle', t0 = 0, timer = 0, best = store.get('aleena-sense', 0);
    const showBest = extra => { out.textContent = ''; if (extra) { out.append(extra + ' '); } out.append('Best: '); const b = document.createElement('b'); b.textContent = best ? best + ' ms' : 'none yet'; out.append(b); };
    showBest();
    pad.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (state === 'idle') {
        state = 'wait'; pad.className = 'sense-pad wait'; label.textContent = 'Wait for the tingle…';
        timer = setTimeout(() => { state = 'now'; t0 = performance.now(); pad.className = 'sense-pad now'; label.textContent = 'NOW!'; buzz([60, 30, 60]); }, rnd(1400, 4200));
      } else if (state === 'wait') {
        clearTimeout(timer); state = 'idle'; pad.className = 'sense-pad'; label.textContent = 'Tap to retry';
        showBest('Too early. That was anxiety, not spidey-sense.');
      } else if (state === 'now') {
        const ms = Math.round(performance.now() - t0); state = 'idle'; pad.className = 'sense-pad'; label.textContent = ms + ' ms. Again?';
        if (!best || ms < best) { best = ms; store.set('aleena-sense', best); }
        const verdict = ms < 240 ? 'Spider-Aleena confirmed. The fries are safe.' : ms < 340 ? 'Friendly neighbourhood level. Respectable.' : ms < 500 ? 'Aunt May reflexes. Said with love.' : 'You are the one stealing the fries, aren\'t you.';
        showBest(verdict); buzz(15);
        if (ms < 240) { const r = pad.getBoundingClientRect(); party(70, r.left + r.width / 2, r.top + r.height / 2, .8); }
      }
    });
    pad.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ---------- post-credits scene ---------- */
  const pcBtn = $('#pcBtn'), scene = $('#pcScene');
  if (pcBtn) pcBtn.addEventListener('click', () => {
    pcBtn.hidden = true; scene.hidden = false;
    const lines = [...scene.children];
    lines.forEach((p, i) => setTimeout(() => {
      p.classList.add('in');
      if (i === lines.length - 2) { party(200, innerWidth / 2, innerHeight * .5, 1.3); buzz([40, 60, 40, 60, 200]); }
    }, 300 + i * 950));
    setTimeout(() => scene.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  });
})();
