/* TypingTestKaro — Typing Race
   Player car vs 3 bot cars. Type the passage; each correct character moves your car. */
(function () {
  'use strict';

  var SLUG = 'typing-race';
  var root = document.querySelector('#game-root[data-game="' + SLUG + '"]');
  if (!root) return;

  var W = window.TE_WORDS || {};
  var BEST_KEY = 'te_game_' + SLUG + '_best';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- small helpers ---------- */
  function h(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }
  function loadBest() {
    try { var v = JSON.parse(localStorage.getItem(BEST_KEY)); return v && typeof v === 'object' ? v : {}; }
    catch (e) { return {}; }
  }
  function saveBest(obj) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(obj)); } catch (e) { /* storage unavailable */ }
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function chipGroup(label, options, current, onPick) {
    var chips = h('div', { class: 'chips' });
    options.forEach(function (o) {
      var b = h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(o.value === current), text: o.label,
        onclick: function () {
          chips.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          onPick(o.value);
        }
      });
      chips.appendChild(b);
    });
    return h('div', { class: 'g-opt', role: 'group', 'aria-label': label }, [
      h('span', { class: 'g-opt-label', 'aria-hidden': 'true', text: label }), chips
    ]);
  }
  function stat(label) {
    var b = h('b', { text: '0' });
    var el = h('div', { class: 'g-stat' }, [h('span', { text: label }), b]);
    return { el: el, set: function (v) { v = String(v); if (b.textContent !== v) b.textContent = v; } };
  }
  function resultItem(value, label, main) {
    return h('div', { class: 'g-result-item' + (main ? ' is-main' : '') }, [h('b', { text: String(value) }), h('span', { text: label })]);
  }
  function ordinal(n) { return n + (['th', 'st', 'nd', 'rd'][n] || 'th'); }
  function carSvg(color) {
    return '<svg viewBox="0 0 64 28" aria-hidden="true" focusable="false">' +
      '<path d="M4 18 L9 10 Q11 7 15 7 L36 7 Q40 7 43 10 L49 15 L58 16 Q62 17 62 20 L62 22 Q62 23 60 23 L4 23 Q2 23 2 21 Z" fill="' + color + '"/>' +
      '<path d="M15.5 9.5 L34 9.5 Q37 9.5 39 11.5 L42 14.5 L12.5 14.5 Z" fill="rgba(255,255,255,.78)"/>' +
      '<rect x="26" y="9.5" width="2" height="5" fill="' + color + '"/>' +
      '<circle cx="16" cy="23" r="4.6" fill="#1b1d27"/><circle cx="16" cy="23" r="2" fill="#c9ccd6"/>' +
      '<circle cx="48" cy="23" r="4.6" fill="#1b1d27"/><circle cx="48" cy="23" r="2" fill="#c9ccd6"/></svg>';
  }

  /* ---------- config ---------- */
  var LEVELS = [
    { value: 25, label: 'Beginner · 25' },
    { value: 35, label: 'Easy · 35' },
    { value: 45, label: 'Medium · 45' },
    { value: 60, label: 'Hard · 60' }
  ];
  var BOTS = [
    { name: 'Swift', color: '#e0851b' },
    { name: 'Dash', color: '#12a36b' },
    { name: 'Turbo', color: '#c93d9a' }
  ];
  var PLAYER_COLOR = '#3b6cf0';
  var FALLBACK_SENTENCES = ['Keep your eyes on the screen and type each word with care.'];

  var opts = { level: 35 };
  var best = loadBest();

  /* ---------- state ---------- */
  var S = null;       // per-race state
  var raf = 0;
  var endTimer = 0;

  /* ---------- DOM: start screen ---------- */
  var bestLine = h('p', { class: 'g-best-line' });
  var startScreen = h('section', { class: 'g-panel g-start', 'aria-labelledby': 'g-race-title' }, [
    h('h2', { class: 'g-title', id: 'g-race-title', text: 'Typing Race' }),
    h('p', { class: 'g-lead', text: 'Race three bot cars to the finish line. Every correct letter pushes your car forward.' }),
    h('ul', { class: 'g-howto' }, [
      h('li', { text: 'Wait for the 3-2-1 countdown, then start typing the passage.' }),
      h('li', { text: 'Mistakes are shown in red. Fix them with Backspace to keep moving.' }),
      h('li', { text: 'Finish first to win. Your WPM and accuracy are shown at the end.' })
    ]),
    h('div', { class: 'g-options' }, [
      chipGroup('Bot speed (WPM)', LEVELS, opts.level, function (v) { opts.level = v; })
    ]),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Start race', onclick: startRace }),
    bestLine
  ]);

  /* ---------- DOM: play screen ---------- */
  var sWpm = stat('WPM'), sAcc = stat('Accuracy'), sTime = stat('Time'), sPos = stat('Position');
  var quitBtn = h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Quit', onclick: quitRace });
  var hud = h('div', { class: 'g-hud' }, [sWpm.el, sAcc.el, sTime.el, sPos.el, h('div', { class: 'g-hud-actions' }, [quitBtn])]);
  var track = h('div', { class: 'g-track', 'aria-label': 'Race track', role: 'img' });
  var passageText = h('div', { class: 'g-passage-text' });
  var passage = h('div', { class: 'g-passage', 'aria-label': 'Passage to type' }, [passageText]);
  var input = h('input', {
    type: 'text', class: 'g-input', 'aria-label': 'Type the passage here',
    autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'next'
  });
  var countdownEl = h('div', { class: 'g-countdown', 'aria-live': 'assertive', hidden: true });
  var overlay = h('div', { class: 'g-overlay', hidden: true }, [
    h('span', { class: 'g-overlay-title', text: 'Paused' }),
    h('button', { type: 'button', class: 'btn btn-primary', text: 'Click here to focus', onclick: focusInput }),
    h('p', { text: 'The race resumes when the typing area is focused.' })
  ]);
  var wrap = h('div', { class: 'g-race-wrap' }, [track, passage, input, countdownEl, overlay]);
  var playScreen = h('section', { class: 'g-race-play', hidden: true, 'aria-label': 'Race in progress' }, [hud, wrap]);

  /* ---------- DOM: result screen ---------- */
  var resultScreen = h('section', { class: 'g-panel g-result', hidden: true, 'aria-live': 'polite' });

  root.textContent = '';
  root.appendChild(startScreen);
  root.appendChild(playScreen);
  root.appendChild(resultScreen);
  updateBestLine();

  function updateBestLine() {
    bestLine.textContent = '';
    if (best.wpm) {
      bestLine.appendChild(document.createTextNode('Personal best: '));
      bestLine.appendChild(h('b', { text: best.wpm + ' WPM' }));
      if (best.wins) bestLine.appendChild(document.createTextNode(' · Wins: ' + best.wins));
    } else {
      bestLine.textContent = 'No personal best yet — set one now!';
    }
  }
  function show(screen) {
    [startScreen, playScreen, resultScreen].forEach(function (s) { s.hidden = s !== screen; });
  }
  function focusInput() { input.focus({ preventScroll: true }); }

  /* Clicking the track or passage refocuses the hidden input. */
  wrap.addEventListener('mousedown', function (e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    focusInput();
  });
  wrap.addEventListener('click', function (e) { if (!e.target.closest('button')) focusInput(); });
  input.addEventListener('focus', syncFocus);
  input.addEventListener('blur', syncFocus);
  input.addEventListener('paste', function (e) { e.preventDefault(); });
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });

  function syncFocus() {
    var focused = document.activeElement === input;
    passage.classList.toggle('is-focused', focused);
    if (S && (S.phase === 'countdown' || S.phase === 'racing')) {
      S.paused = !focused;
      overlay.hidden = focused;
    } else {
      overlay.hidden = true;
    }
  }

  /* ---------- race setup ---------- */
  function buildPassage() {
    var list = shuffle(W.sentences && W.sentences.length ? W.sentences : FALLBACK_SENTENCES);
    var out = [], words = 0, i = 0;
    // Add sentences until we have at least ~40 words, never exceeding ~60.
    while (words < 40 && out.length < 40) {
      var s = list[i % list.length]; i++;
      var n = s.split(' ').length;
      if (words + n > 60 && words >= 30) break;
      out.push(s); words += n;
    }
    return out.join(' ');
  }

  function startRace() {
    stopLoop();
    var text = buildPassage();
    S = {
      text: text, phase: 'countdown', paused: false,
      countdown: 3, elapsed: 0, last: 0,
      wordStart: 0, progress: 0, errLen: 0, lastTyped: '',
      keys: 0, goodKeys: 0, finishTime: 0, place: 0,
      spanClass: [], bots: []
    };
    // Bots: base speed ± 12%, speed fluctuates while racing.
    S.bots = BOTS.map(function (b) {
      var wpm = Math.round(opts.level * (0.88 + Math.random() * 0.24));
      return { name: b.name, color: b.color, wpm: wpm, chars: 0, factor: 1, target: 1, retarget: 0, finishTime: 0 };
    });

    // Build track lanes
    track.textContent = '';
    S.lanes = [];
    var racers = [{ name: 'You', color: PLAYER_COLOR, player: true }].concat(S.bots);
    racers.forEach(function (r) {
      var car = h('div', { class: 'g-car', html: carSvg(r.color) });
      var sub = h('small', { text: r.player ? 'your car' : r.wpm + ' wpm' });
      var lane = h('div', { class: 'g-lane' }, [car]);
      var row = h('div', { class: 'g-lane-row' + (r.player ? ' is-player' : '') }, [
        h('div', { class: 'g-lane-name' }, [r.name, sub]), lane
      ]);
      track.appendChild(row);
      S.lanes.push({ car: car, lane: lane, placeEl: null });
    });

    // Passage characters
    passageText.textContent = '';
    S.spans = [];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var sp = h('span', { class: 'c', text: text[i] });
      S.spans.push(sp); S.spanClass.push('c');
      frag.appendChild(sp);
    }
    passageText.appendChild(frag);
    passageText.scrollTop = 0;
    S.scrollTop = 0;

    input.value = '';
    sWpm.set('0'); sAcc.set('100%'); sTime.set('0:00'); sPos.set('–');
    show(playScreen);
    focusInput();
    syncFocus();
    renderPassage();
    countdownEl.hidden = false;
    setCountdown('3');
    S.last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function setCountdown(txt) {
    if (countdownEl.dataset.v === txt) return;
    countdownEl.dataset.v = txt;
    countdownEl.textContent = '';
    countdownEl.appendChild(h('span', { text: txt }));
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(endTimer);
  }

  function quitRace() {
    stopLoop();
    S = null;
    input.blur();
    show(startScreen);
    updateBestLine();
  }

  /* ---------- main loop ---------- */
  function loop(now) {
    if (!S) return;
    var dt = Math.min(1, (now - S.last) / 1000);
    S.last = now;

    if (!S.paused) {
      if (S.phase === 'countdown') {
        S.countdown -= dt;
        if (S.countdown <= 0) {
          S.phase = 'racing';
          setCountdown('GO!');
          setTimeout(function () { if (S && S.phase !== 'countdown') countdownEl.hidden = true; }, 600);
        } else {
          setCountdown(String(Math.ceil(S.countdown)));
        }
      } else if (S.phase === 'racing' || S.phase === 'finished') {
        S.elapsed += dt;
        updateBots(dt);
      }
    }
    renderCars();
    renderHud();
    raf = requestAnimationFrame(loop);
  }

  function updateBots(dt) {
    var len = S.text.length;
    S.bots.forEach(function (b) {
      if (b.finishTime) return;
      // Every ~0.8s pick a new speed factor; ease towards it for natural variation.
      b.retarget -= dt;
      if (b.retarget <= 0) { b.target = 0.8 + Math.random() * 0.4; b.retarget = 0.5 + Math.random() * 0.8; }
      b.factor += (b.target - b.factor) * Math.min(1, dt * 2);
      b.chars += (b.wpm * 5 / 60) * b.factor * dt;
      if (b.chars >= len) { b.chars = len; b.finishTime = S.elapsed; }
    });
  }

  function renderCars() {
    var len = S.text.length;
    var ps = [S.progress / len].concat(S.bots.map(function (b) { return b.chars / len; }));
    ps.forEach(function (p, i) { S.lanes[i].car.style.setProperty('--p', p.toFixed(4)); });
  }

  function currentPlace() {
    if (S.finishTime) return S.place;
    var ahead = S.bots.filter(function (b) { return b.finishTime || b.chars > S.progress; }).length;
    return ahead + 1;
  }

  function renderHud() {
    var t = S.finishTime || S.elapsed;
    var mins = t / 60;
    var wpm = t > 1 ? Math.round((S.progress / 5) / mins) : 0;
    sWpm.set(String(wpm));
    sAcc.set((S.keys ? Math.round(S.goodKeys / S.keys * 100) : 100) + '%');
    var sec = Math.floor(t);
    sTime.set(Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'));
    sPos.set(S.phase === 'countdown' ? '–' : ordinal(currentPlace()) + ' / 4');
  }

  /* ---------- typing ---------- */
  function onInput() {
    if (!S || S.phase !== 'racing') { input.value = ''; return; }
    var typed = input.value.replace(/ /g, ' ');
    var prev = S.lastTyped;
    var seg = S.text.slice(S.wordStart);

    // Keystroke accuracy: count each newly added character.
    if (typed.length > prev.length) {
      var base = typed.slice(0, prev.length) === prev ? prev.length : typed.length - 1;
      for (var i = base; i < typed.length; i++) {
        S.keys++;
        if (typed.slice(0, i + 1) === seg.slice(0, i + 1)) S.goodKeys++;
      }
    }

    // Longest correct prefix of what's typed for the current word.
    var lcp = 0;
    while (lcp < typed.length && typed[lcp] === seg[lcp]) lcp++;

    if (lcp === typed.length && typed.length > 0) {
      if (typed[typed.length - 1] === ' ') {
        // Word (plus its space) completed correctly: commit and clear the buffer.
        S.wordStart += typed.length;
        typed = ''; lcp = 0;
        input.value = '';
      }
    }
    S.lastTyped = typed;
    S.progress = S.wordStart + lcp;
    S.errLen = Math.min(typed.length - lcp, S.text.length - S.progress);
    renderPassage();

    if (S.progress >= S.text.length) finishPlayer();
  }

  function renderPassage() {
    var p = S.progress, e = S.errLen, spans = S.spans, cls = S.spanClass;
    var cur = p + e;
    for (var i = 0; i < spans.length; i++) {
      var c = i < p ? 'c is-done' : i < p + e ? 'c is-err' : i === cur ? 'c is-cur' : 'c';
      if (cls[i] !== c) { cls[i] = c; spans[i].className = c; }
    }
    // Keep the current line visible (show one completed line above it).
    var el = spans[Math.min(cur, spans.length - 1)];
    if (el) {
      var lh = parseFloat(getComputedStyle(passageText).lineHeight) || 28;
      var line = Math.round((el.offsetTop - spans[0].offsetTop) / lh);
      var top = Math.max(0, (line - 1) * lh);
      if (Math.abs(top - S.scrollTop) > 2) { S.scrollTop = top; passageText.scrollTop = top; }
    }
  }

  function finishPlayer() {
    S.phase = 'finished';
    S.finishTime = S.elapsed;
    S.place = 1 + S.bots.filter(function (b) { return b.finishTime && b.finishTime <= S.finishTime; }).length;
    input.value = '';
    overlay.hidden = true;
    var tag = h('span', { class: 'g-car-place', text: ordinal(S.place) });
    S.lanes[0].lane.appendChild(tag);
    // Let the cars roll on briefly before showing results.
    endTimer = setTimeout(showResults, reduceMotion ? 200 : 1100);
  }

  /* ---------- results ---------- */
  function showResults() {
    var st = S;
    stopLoop();
    input.blur();
    var mins = st.finishTime / 60;
    var wpm = Math.round((st.text.length / 5) / mins);
    var acc = st.keys ? Math.round(st.goodKeys / st.keys * 100) : 100;
    var isBest = !best.wpm || wpm > best.wpm;
    if (isBest) best.wpm = wpm;
    if (st.place === 1) best.wins = (best.wins || 0) + 1;
    saveBest(best);

    var msgs = ['You won the race!', 'So close — second place!', 'Third place. Keep practising!', 'Fourth place. The bots got you this time.'];
    var heading = h('h2', { tabindex: '-1', text: msgs[st.place - 1] });
    resultScreen.textContent = '';
    resultScreen.appendChild(h('div', { class: 'g-place-big', text: ordinal(st.place) }));
    resultScreen.appendChild(heading);
    resultScreen.appendChild(h('p', { class: 'g-result-sub', text: 'Bots raced at about ' + opts.level + ' WPM.' }));
    if (isBest) resultScreen.appendChild(h('p', { class: 'g-pb' }, [h('span', { class: 'badge badge-success', text: 'New personal best!' })]));
    resultScreen.appendChild(h('div', { class: 'g-result-grid is-4' }, [
      resultItem(wpm, 'Words per minute', true),
      resultItem(acc + '%', 'Accuracy'),
      resultItem(st.finishTime.toFixed(1) + 's', 'Race time'),
      resultItem(best.wpm, 'Best WPM')
    ]));
    resultScreen.appendChild(h('div', { class: 'g-actions' }, [
      h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Play again', onclick: startRace }),
      h('button', { type: 'button', class: 'btn btn-outline btn-lg', text: 'Change settings', onclick: function () { S = null; show(startScreen); updateBestLine(); } })
    ]));
    S = null;
    show(resultScreen);
    heading.focus({ preventScroll: false });
  }
})();
