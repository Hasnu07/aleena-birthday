/* ===== music.js: a looping music-box "Happy Birthday", synthesised in the browser ===== */
(function () {
  const BPM = 104, B = 60 / BPM, LOOP = 24; // 24 beats per verse (the pickup overlaps the last bar)
  const F = {
    G2: 98.00, C3: 130.81, F2: 87.31, G3: 196.00, A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
    G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
  };
  // melody: [note, beats]
  const MEL = [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2], ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
  ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 1], ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 2]];
  // waltz accompaniment: one chord per beat, bars start on beat 1
  const CH = { C: ['C3', ['G3', 'C4', 'E4']], G: ['G2', ['G3', 'B3', 'D4']], Fm: ['F2', ['A3', 'C4']] };
  const BARS = [['C', 'C', 'C'], ['G', 'G', 'G'], ['G', 'G', 'G'], ['C', 'C', 'C'], ['C', 'C', 'C'], ['Fm', 'Fm', 'Fm'], ['C', 'C', 'G'], ['C', 'C', null]];

  let AC = null, master = null, bus = null, playing = false, nextStart = 0, timer = 0, verse = 0, live = [];
  let pausedBy = new Set();
  const pref = { get off() { try { return localStorage.getItem('aleena-music') === 'off'; } catch (e) { return false; } }, set off(v) { try { localStorage.setItem('aleena-music', v ? 'off' : 'on'); } catch (e) { } } };

  function unlock() {
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.gain.value = .0001; master.connect(AC.destination);
        bus = AC.createGain(); bus.connect(master);
        const d = AC.createDelay(1); d.delayTime.value = .29; const fb = AC.createGain(); fb.gain.value = .26; const wet = AC.createGain(); wet.gain.value = .22;
        bus.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(master);
      }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { }
    return !!AC;
  }

  function tone(f, t, vol, type, dec) {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dec);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dec + .05);
    live.push(o); o.onended = () => { const i = live.indexOf(o); if (i >= 0) live.splice(i, 1); };
  }
  const bell = (f, t, vol) => { tone(f, t, vol, 'sine', 1.7); tone(f * 2, t, vol * .32, 'sine', .9); tone(f * 3.01, t, vol * .1, 'sine', .35); };

  function scheduleVerse(t0, v) {
    let t = t0;
    for (const [n, d] of MEL) {
      bell(F[n], t, .2);
      if (v % 2 === 1) bell(F[n] * 2, t + .02, .07);          // second verse: sparkle an octave up
      t += d * B;
    }
    BARS.forEach((bar, i) => bar.forEach((c, j) => {
      if (!c) return; const when = t0 + (1 + i * 3 + j) * B; const [root, up] = CH[c];
      if (j === 0) tone(F[root], when, .16, 'triangle', 1.1);
      else up.forEach(u => tone(F[u], when, .045, 'triangle', .5));
    }));
  }

  function tick() { if (!playing || !AC) return; while (nextStart < AC.currentTime + 1) { scheduleVerse(nextStart, verse++); nextStart += LOOP * B; } }

  function paint() {
    document.body.classList.toggle('music-on', playing);
    const b = document.getElementById('musicBtn'); if (b) { b.setAttribute('aria-pressed', String(playing)); b.title = playing ? 'Music on' : 'Music off'; }
  }

  function start(delay) {
    if (playing || pref.off || !unlock()) return false;
    playing = true; verse = 0; nextStart = AC.currentTime + .08 + (delay || 0);
    master.gain.cancelScheduledValues(AC.currentTime); master.gain.setValueAtTime(.0001, AC.currentTime); master.gain.exponentialRampToValueAtTime(.55, AC.currentTime + .4);
    clearInterval(timer); timer = setInterval(tick, 150); tick(); paint();
    if (!start.announced && window.ALEENA && window.ALEENA.toast) { start.announced = true; setTimeout(() => window.ALEENA.toast('🎵', 'Now playing', 'Happy Birthday (Aleena\'s Version). Mute is top right.'), 3200); }
    return true;
  }
  function stop() {
    if (!playing) return; playing = false; clearInterval(timer);
    const now = AC.currentTime; master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(Math.max(master.gain.value, .0001), now); master.gain.exponentialRampToValueAtTime(.0001, now + .2);
    const old = live.slice(); live = []; setTimeout(() => old.forEach(o => { try { o.onended = null; o.stop(); } catch (e) { } }), 260);
    paint();
  }
  function toggle() { if (playing) { pref.off = true; pausedBy.clear(); stop(); } else { pref.off = false; start(); } }
  // pause for something else (a video, a hidden tab) and come back afterwards
  function hold(why) { if (playing) { pausedBy.add(why); stop(); } }
  function release(why) { if (pausedBy.delete(why) && !pausedBy.size && !pref.off) start(); }
  function beep(f, d) { if (!unlock()) return; const t = AC.currentTime; const o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02); }

  window.MUSIC = { unlock, start, stop, toggle, beep, hold, release, state: () => ({ playing, ctx: AC ? AC.state : 'none', scheduled: live.length, verse, off: pref.off }) };

  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('musicBtn'); if (b) b.addEventListener('click', toggle);
    document.querySelectorAll('video').forEach(v => {
      v.addEventListener('play', () => hold('video'));
      const back = () => { if ([...document.querySelectorAll('video')].every(x => x.paused || x.ended)) release('video'); };
      v.addEventListener('pause', back); v.addEventListener('ended', back);
    });
    paint();
  });
  document.addEventListener('visibilitychange', () => { document.hidden ? hold('hidden') : release('hidden'); });
  // if the intro was skipped by reduced-motion, start on the first tap anywhere
  document.addEventListener('pointerdown', e => { unlock(); if (e.target.closest && e.target.closest('#musicBtn')) return; const intro = document.getElementById('intro'); if (!intro || intro.classList.contains('out')) start(); }, { once: true });
})();
