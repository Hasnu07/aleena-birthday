/* ===== Aleena Grand Prix: a tiny top-down F1 racer ===== */
(function () {
  const cv = document.getElementById('raceCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const ROAD_L = 44, ROAD_R = W - 44, ROAD_W = ROAD_R - ROAD_L;
  const LANES = [ROAD_L + ROAD_W / 6, ROAD_L + ROAD_W / 2, ROAD_R - ROAD_W / 6];
  const LAPS = 3, LAP_LEN = 9000, GRID = 20;
  const CAR_W = 34, CAR_H = 72;
  const PLAYER_Y = H - 150;

  const $ = s => document.querySelector(s);
  const overlay = $('#raceOverlay'), oTitle = $('#overlayTitle'), oText = $('#overlayText'), oImg = document.querySelector('.race-overlay-img');
  const startBtn = $('#raceStart');
  const hudPos = $('#hudPos'), hudLap = $('#hudLap'), hudSpeed = $('#hudSpeed'), hudBest = $('#hudBest'), drsFill = $('#drsFill'), radio = $('#radio');

  const TEAMS = [
    { c: '#e10600', a: '#fff', n: '16' }, { c: '#e10600', a: '#fff', n: '44' },
    { c: '#1e3a8a', a: '#ffd400', n: '1' }, { c: '#1e3a8a', a: '#ffd400', n: '22' },
    { c: '#b8c0c8', a: '#0bd1c8', n: '63' }, { c: '#b8c0c8', a: '#0bd1c8', n: '12' },
    { c: '#0a6b4a', a: '#c9f05a', n: '14' }, { c: '#0a6b4a', a: '#c9f05a', n: '18' },
    { c: '#1b4fd8', a: '#fff', n: '23' }, { c: '#2a5cff', a: '#ff5fa8', n: '10' },
    { c: '#0d1b2a', a: '#39ff88', n: '27' }, { c: '#5a2d82', a: '#fff', n: '31' },
    { c: '#ff8000', a: '#000', n: '4', lando: true }
  ];

  let keys = { left: false, right: false, up: false, down: false, drs: false };
  let state = 'idle';
  let px, pxTarget, speed, dist, lap, pos, drsCharge, drsOn, drsT, hitT, traffic, pickups, t, spawnT, shake, best, finalPos, tilt, lightsOn, lightsT, pointerX, msgT;
  let bananas = [], spinT = 0;
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  best = +localStorage.getItem('aleena-gp-best') || 0;
  if (best) hudBest.textContent = 'P' + best;

  /* ---------- audio ---------- */
  let AC = null;
  function beep(f = 440, d = .12, type = 'square', g = .05) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), v = AC.createGain();
      o.type = type; o.frequency.value = f; v.gain.value = g;
      o.connect(v); v.connect(AC.destination); o.start();
      v.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.stop(AC.currentTime + d);
    } catch (e) { }
  }

  /* ---------- helpers ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const RADIO = {
    start: ['"Radio check, Aleena. Twenty on the grid, you are last. Fix it."'],
    crash: ['"Contact. Mean mode activated."', '"That was not your fault, apparently."', '"Box box? No. Keep going, you are fine."', '"Eye-roll detected on the telemetry."'],
    cake: ['"Cake collected. DRS refilled. Priorities."', '"Someone left cake on the racing line. Legend."'],
    lando: ['"That was Lando. Oscar says yep."', '"Papaya on papaya. You win that one."'],
    banana: ['"You hit the banana phone. It was Florentino. He will call back."', '"Banana on track. Yes, that one was yours."'],
    p: { 18: '"P18. You passed someone. Their feelings are hurt."', 15: '"P15. Good pace, keep your head down."', 12: '"P12. Lando is behind you now. Do not look back."', 7: '"P7. Florentino is watching. Act natural."', 10: '"P10, Aleena. Points. Jude is watching."', 5: '"P5. Top five. Bernabéu would be loud right now."', 3: '"P3. That is a podium if you hold it."', 2: '"P2. One more. One more."', 1: '"THAT IS P1 ALEENA. P1. HAPPY BIRTHDAY."' }
  };
  function say(m) { radio.textContent = m; msgT = 240; }

  function reset() {
    px = LANES[1]; pxTarget = null; speed = 0; dist = 0; lap = 1; pos = GRID; drsCharge = 1; drsOn = false; drsT = 0; hitT = 0;
    traffic = []; pickups = []; bananas = []; spinT = 0; t = 0; spawnT = 40; shake = 0; finalPos = 0; tilt = 0; lightsOn = 0; lightsT = 0; pointerX = null; msgT = 0;
    hud();
  }

  function hud() {
    hudPos.textContent = 'P' + pos; hudLap.textContent = Math.min(lap, LAPS) + ' / ' + LAPS;
    hudSpeed.textContent = Math.round(speed * 26) + ' km/h'; drsFill.style.width = (drsCharge * 100) + '%';
  }

  /* ---------- drawing ---------- */
  function drawCar(x, y, color, accent, num, angle = 0, flash = false) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    if (flash) ctx.globalAlpha = .45 + .4 * Math.sin(t * .6);
    // wheels
    ctx.fillStyle = '#111';
    [[-19, -24], [11, -24], [-20, 16], [12, 16]].forEach(([wx, wy]) => { roundRect(wx, wy, 8, 16, 3); ctx.fill(); });
    // rear wing
    ctx.fillStyle = color; roundRect(-18, 24, 36, 7, 2); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(-18, 27, 36, 2);
    // body
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(6, -36); ctx.lineTo(9, -8); ctx.lineTo(13, -4); ctx.lineTo(13, 18); ctx.lineTo(-13, 18); ctx.lineTo(-13, -4); ctx.lineTo(-9, -8); ctx.closePath(); ctx.fill();
    // sidepods
    ctx.fillStyle = shade(color, -25); roundRect(-13, -4, 5, 20, 2); ctx.fill(); roundRect(8, -4, 5, 20, 2); ctx.fill();
    // front wing
    ctx.fillStyle = color; roundRect(-19, -34, 38, 5, 2); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(-19, -31, 38, 1.5);
    // cockpit + halo
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, 2, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 1, 7, Math.PI, 0); ctx.stroke();
    // number
    ctx.fillStyle = accent; ctx.font = 'bold 9px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(num, 0, 15);
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255); return `rgb(${r},${g},${b})`; }

  function drawTrack() {
    const off = dist % 80;
    // grass
    ctx.fillStyle = '#2f9e44'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2a8f3c';
    for (let y = -80 + off; y < H; y += 80) ctx.fillRect(0, y, W, 40);
    // kerbs
    for (let y = -80 + off % 40; y < H; y += 40) {
      ctx.fillStyle = (Math.floor((y - off) / 40) % 2) ? '#e8e8e8' : '#e0262d';
      ctx.fillRect(ROAD_L - 10, y, 10, 40); ctx.fillRect(ROAD_R, y, 10, 40);
    }
    // asphalt
    ctx.fillStyle = '#3a3f4b'; ctx.fillRect(ROAD_L, 0, ROAD_W, H);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(ROAD_L + ROAD_W / 3 - 20, 0, 40, H); ctx.fillRect(ROAD_L + 2 * ROAD_W / 3 - 20, 0, 40, H);
    // lane lines
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.setLineDash([30, 30]); ctx.lineDashOffset = -off * 1.0;
    ctx.beginPath(); ctx.moveTo(ROAD_L + ROAD_W / 3, 0); ctx.lineTo(ROAD_L + ROAD_W / 3, H); ctx.moveTo(ROAD_L + 2 * ROAD_W / 3, 0); ctx.lineTo(ROAD_L + 2 * ROAD_W / 3, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ROAD_L + 2, 0); ctx.lineTo(ROAD_L + 2, H); ctx.moveTo(ROAD_R - 2, 0); ctx.lineTo(ROAD_R - 2, H); ctx.stroke();
    // start / finish line
    const nextLine = lap * LAP_LEN;
    const dy = nextLine - dist;
    if (dy < H + 40) {
      const y = PLAYER_Y - dy;
      for (let i = 0; i < 2; i++) for (let x = ROAD_L; x < ROAD_R; x += 17) {
        ctx.fillStyle = ((x - ROAD_L) / 17 + i) % 2 ? '#fff' : '#111'; ctx.fillRect(x, y + i * 12, 17, 12);
      }
      ctx.fillStyle = '#fff'; ctx.font = '16px "Bebas Neue", Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(lap === LAPS ? 'FINISH' : 'LAP ' + (lap + 1), W / 2, y - 8);
    }
  }

  function drawPickup(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(t * .1) * .15);
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎂', 0, 0); ctx.restore();
  }

  function drawHUDCanvas() {
    // lap progress
    const prog = ((dist % LAP_LEN) / LAP_LEN);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRect(14, 14, W - 28, 10, 5); ctx.fill();
    ctx.fillStyle = '#ff8000'; roundRect(14, 14, (W - 28) * prog, 10, 5); ctx.fill();
    // position badge
    ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(14, 32, 70, 34, 10); ctx.fill();
    ctx.fillStyle = pos === 1 ? '#ffd166' : '#fff'; ctx.font = '26px "Bebas Neue", Impact, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('P' + pos, 24, 59);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(W - 96, 32, 82, 34, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText('LAP ' + Math.min(lap, LAPS) + '/' + LAPS, W - 24, 59);
    if (drsOn) {
      ctx.fillStyle = '#39ff88'; ctx.font = '22px "Bebas Neue", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DRS OPEN', W / 2, 92);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const x = rnd(ROAD_L, ROAD_R), y = rnd(0, H); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40 + rnd(0, 60)); ctx.stroke(); }
    }
    if (lap === LAPS && pos === 1 && dist % LAP_LEN > LAP_LEN * .6) {
      ctx.fillStyle = '#ffd166'; ctx.font = '18px "Bebas Neue", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HOLD IT. HOLD IT.', W / 2, 120);
    }
  }

  function drawLights() {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#06080f'; roundRect(W / 2 - 150, 140, 300, 80, 16); ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(W / 2 - 112 + i * 56, 180, 20, 0, Math.PI * 2);
      const on = i < lightsOn && lightsOn <= 5;
      ctx.fillStyle = on ? '#ff2d2d' : '#2a1010'; ctx.shadowBlur = on ? 26 : 0; ctx.shadowColor = '#ff2d2d'; ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#fff'; ctx.font = '30px "Bebas Neue", Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(lightsOn > 5 ? 'LIGHTS OUT. GO ALEENA.' : 'ALEENA GRAND PRIX', W / 2, 260);
  }

  /* ---------- update ---------- */
  function spawn() {
    const near = traffic.filter(c => c.y < 140).length;
    if (near >= 2) return;
    const lane = (Math.random() * 3) | 0;
    if (traffic.some(c => c.lane === lane && c.y < 200)) return;
    const team = TEAMS[(Math.random() * TEAMS.length) | 0];
    traffic.push({ lane, x: LANES[lane] + rnd(-8, 8), y: -100, v: rnd(5, 8.5), team, counted: false, swerve: Math.random() < .25 ? rnd(300, 900) : 0 });
  }

  function update() {
    t++;
    if (msgT > 0 && --msgT === 0) radio.textContent = '"Copy."';
    if (state === 'lights') {
      lightsT++;
      if (lightsT % 40 === 0 && lightsOn < 5) { lightsOn++; beep(440, .15); }
      if (lightsOn === 5 && lightsT > 5 * 40 + 50) { lightsOn = 6; beep(880, .5, 'square', .06); state = 'race'; say(RADIO.start[0]); }
      return;
    }
    if (state !== 'race') return;

    // steering
    const steer = 6.5;
    if (pointerX != null) { const d = pointerX - px; px += clamp(d, -steer, steer); tilt = clamp(d / 40, -1, 1) * .18; }
    else { let dx = 0; if (keys.left) dx -= steer; if (keys.right) dx += steer; px += dx; tilt += ((dx / steer) * .18 - tilt) * .2; }
    px = clamp(px, ROAD_L + CAR_W / 2 + 4, ROAD_R - CAR_W / 2 - 4);

    // throttle
    let target = 12;
    if (keys.up) target = 15; if (keys.down) target = 6;
    if (hitT > 0) target = Math.min(target, 4);
    if (keys.drs && drsCharge > .25 && !drsOn && hitT <= 0) { drsOn = true; drsT = 70; beep(1200, .2, 'sawtooth', .04); }
    if (drsOn) { target += 6; drsT--; drsCharge = Math.max(0, drsCharge - .012); if (drsT <= 0 || drsCharge <= 0) drsOn = false; }
    else drsCharge = Math.min(1, drsCharge + .0012);
    speed += (target - speed) * (speed < target ? .04 : .12);
    dist += speed;
    if (hitT > 0) hitT--;
    if (shake > 0) shake--;

    // lap logic
    if (dist >= lap * LAP_LEN) {
      if (lap >= LAPS) { finish(); return; }
      lap++; beep(660, .2); say(lap === LAPS ? '"Final lap. Everything you have, Aleena."' : '"Lap ' + lap + '. Keep it clean."'); hud();
    }

    // traffic
    spawnT -= speed / 12;
    if (spawnT <= 0) { spawn(); spawnT = rnd(34, 56); }
    if (Math.random() < .004 * speed / 12 && pickups.length < 1) pickups.push({ x: LANES[(Math.random() * 3) | 0], y: -60 });

    for (const c of traffic) {
      c.y += speed - c.v;
      if (c.swerve) { c.swerve--; if (c.swerve < 60 && c.swerve > 0) { const tl = c.lane === 1 ? (c.x < W / 2 ? 0 : 2) : 1; c.x += (LANES[tl] - c.x) * .06; if (c.swerve === 1) c.lane = tl; } }
      // overtaken
      if (!c.counted && c.y > PLAYER_Y + 10) {
        c.counted = true;
        if (pos > 1) { pos--; beep(700 + (GRID - pos) * 30, .08, 'triangle', .04); if (RADIO.p[pos]) say(RADIO.p[pos]); else if (c.team.lando) say(RADIO.lando[(Math.random() * 2) | 0]); if (pos === 1) window.ALEENA && window.ALEENA.burst(120, innerWidth / 2, innerHeight / 2, .9); }
        hud();
      }
      // collision
      if (hitT <= 0 && Math.abs(c.x - px) < CAR_W - 6 && Math.abs(c.y - PLAYER_Y) < CAR_H - 14) {
        hitT = 75; shake = 18; beep(120, .35, 'sawtooth', .08); buzz([90, 40, 90]);
        pos = Math.min(GRID, pos + 3);
        c.counted = false; c.v = speed + 1.5; // they get back past you
        say(RADIO.crash[(Math.random() * RADIO.crash.length) | 0]); hud();
      }
    }
    traffic = traffic.filter(c => c.y < H + 120);
    for (const p of pickups) {
      p.y += speed - 4;
      if (Math.abs(p.x - px) < 30 && Math.abs(p.y - PLAYER_Y) < 50) { p.got = true; drsCharge = 1; beep(1500, .15, 'triangle', .05); say(RADIO.cake[(Math.random() * 2) | 0]); }
    }
    pickups = pickups.filter(p => !p.got && p.y < H + 40);
    // the banana phone
    if (Math.random() < .0028 * speed / 12 && bananas.length < 1 && dist > 1200) bananas.push({ x: LANES[(Math.random() * 3) | 0], y: -60 });
    for (const b of bananas) {
      b.y += speed;
      if (hitT <= 0 && spinT <= 0 && Math.abs(b.x - px) < 28 && Math.abs(b.y - PLAYER_Y) < 44) {
        b.got = true; spinT = 42; speed *= .45; pos = Math.min(GRID, pos + 1); beep(300, .3, 'triangle', .06); buzz(140);
        say(RADIO.banana[(Math.random() * RADIO.banana.length) | 0]); hud();
      }
    }
    bananas = bananas.filter(b => !b.got && b.y < H + 40);
    if (spinT > 0) spinT--;
    if (t % 6 === 0) hud();
  }

  function finish() {
    state = 'done'; finalPos = pos; document.body.classList.remove('racing'); buzz([40, 60, 40, 60, 200]);
    if (!best || finalPos < best) { best = finalPos; localStorage.setItem('aleena-gp-best', best); hudBest.textContent = 'P' + best; }
    const A = window.ALEENA;
    if (finalPos === 1) {
      oTitle.textContent = 'P1. Aleena wins.'; oText.textContent = 'Chequered flag, fastest lap, the lot. Oscar is nodding. Jude is doing the arms. Happy birthday, champion.';
      oImg.src = 'assets/stickers/aleena-trophy.png'; startBtn.textContent = 'Defend the title';
      A && (A.burst(300, innerWidth / 2, innerHeight * .45, 1.4), setTimeout(() => A.rain(200), 300));
      say('"P1 ALEENA. P1. WHAT A DRIVE. HAPPY BIRTHDAY."');
    } else if (finalPos <= 3) {
      oTitle.textContent = 'P' + finalPos + '. Podium!'; oText.textContent = 'Champagne, trophy, anthem. Close enough to taste it. One more go for the top step?';
      oImg.src = 'assets/stickers/trophy.png'; startBtn.textContent = 'Go for P1'; A && A.burst(160);
      say('"Podium, Aleena. Not bad for a birthday girl."');
    } else {
      oTitle.textContent = 'P' + finalPos + '. Mean mode.'; oText.textContent = 'Points, but you are not happy and neither are we. Dodge the traffic, save DRS for the straights, go again.';
      oImg.src = 'assets/stickers/grumpy.png'; startBtn.textContent = 'Go again';
      say('"P' + finalPos + '. We do not talk about that one."');
    }
    overlay.classList.remove('hidden');
  }

  /* ---------- render ---------- */
  function render() {
    ctx.save();
    if (shake > 0) ctx.translate(rnd(-shake / 3, shake / 3), rnd(-shake / 3, shake / 3));
    drawTrack();
    for (const p of pickups) drawPickup(p);
    for (const b of bananas) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.sin(t * .15) * .3); ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍌', 0, 0); ctx.restore(); }
    for (const c of traffic) drawCar(c.x, c.y, c.team.c, c.team.a, c.team.n);
    drawCar(px, PLAYER_Y, '#ff8000', '#111', '81', tilt + (spinT > 0 ? (42 - spinT) / 42 * Math.PI * 2 : 0), hitT > 0);
    // player glow
    ctx.restore();
    if (state === 'race' || state === 'done') drawHUDCanvas();
    if (state === 'lights') drawLights();
    if (state === 'idle') { drawCar(px, PLAYER_Y, '#ff8000', '#111', '81'); }
  }

  // fixed-step logic (60 updates/s) so the race runs at the same speed on every device
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(now - last, 250); last = now;
    let n = 0;
    while (acc >= 16.667 && n < 5) { update(); acc -= 16.667; n++; }
    if (n === 5) acc = 0;
    render(); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- input ---------- */
  const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ' ': 'drs', Shift: 'drs' };
  addEventListener('keydown', e => { const k = map[e.key]; if (!k) return; if (state === 'race' || state === 'lights') e.preventDefault(); keys[k] = true; pointerX = null; });
  addEventListener('keyup', e => { const k = map[e.key]; if (k) keys[k] = false; });
  document.querySelectorAll('#touchControls button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); keys[k] = true; b.classList.add('active'); pointerX = null; };
    const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove('active'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
  // drag on the canvas to steer
  const toX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) * (W / r.width); };
  cv.addEventListener('pointerdown', e => { if (state !== 'race') return; pointerX = toX(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (pointerX != null && state === 'race') pointerX = toX(e); });
  const endP = () => { pointerX = null; };
  cv.addEventListener('pointerup', endP); cv.addEventListener('pointercancel', endP);
  cv.addEventListener('dblclick', () => { if (state === 'race') { keys.drs = true; setTimeout(() => keys.drs = false, 80); } });

  startBtn.addEventListener('click', () => {
    reset(); overlay.classList.add('hidden'); state = 'lights';
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume && AC.resume(); } catch (e) { }
    document.body.classList.add('racing');
    const stage = cv.closest('.race-stage');
    if (matchMedia('(max-width:860px)').matches) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else cv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // bring the nav and tab bar back if she scrolls away mid-race
  new IntersectionObserver(es => es.forEach(e => document.body.classList.toggle('racing', e.isIntersecting && (state === 'race' || state === 'lights'))), { threshold: .3 }).observe(cv.closest('.race-stage'));

  reset();
  // debug hook: step the simulation without waiting for animation frames
  window.__GP = { step(n = 1, k = {}) { Object.assign(keys, k); for (let i = 0; i < n; i++) update(); render(); return { state, pos, lap, speed: +speed.toFixed(1), dist: Math.round(dist), traffic: traffic.length, drs: +drsCharge.toFixed(2) }; } };
})();
