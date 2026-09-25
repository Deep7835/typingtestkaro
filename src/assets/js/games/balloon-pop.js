/* TypingTestKaro — Balloon Pop
   Beginner game: balloons float up carrying a letter (or a short word). Type it to pop it. */
(function () {
  'use strict';

  var SLUG = 'balloon-pop';
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
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
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
    return { el: el, b: b, set: function (v) { v = String(v); if (b.textContent !== v) b.textContent = v; } };
  }
  function resultItem(value, label, main) {
    return h('div', { class: 'g-result-item' + (main ? ' is-main' : '') }, [h('b', { text: String(value) }), h('span', { text: label })]);
  }
  function removeAfterAnim(el, ms) {
    if (reduceMotion) { el.remove(); return; }
    var done = function () { el.remove(); };
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, ms || 600);
  }

  /* ---------- config ---------- */
  var ROUND = 60; // seconds
  var COLORS = ['#d9344a', '#2563eb', '#7c3aed', '#0e8a5f', '#c2410c', '#db2777', '#0e7490', '#4f46e5'];
  var ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
  var HOME_LETTERS = 'asdfghjkl'.split('');

  var opts = { mode: 'letters', home: false };
  var best = loadBest();
  var S = null;
  var raf = 0;

  function bestKey() { return opts.mode + (opts.home ? '_home' : ''); }
  function wordPool() {
    var src = opts.home ? (W.homeRow || []) : (W.easy || []);
    var list = src.filter(function (w) { return w.length >= 2 && w.length <= 3 && /^[a-z]+$/.test(w); });
    return list.length ? list : (opts.home ? ['as', 'ad', 'had', 'sad'] : ['at', 'on', 'cat', 'sun']);
  }

  /* ---------- DOM: start ---------- */
  var bestLine = h('p', { class: 'g-best-line' });
  var homeBox = h('input', { type: 'checkbox', onchange: function () { opts.home = homeBox.checked; updateBestLine(); } });
  var startScreen = h('section', { class: 'g-panel g-start', 'aria-labelledby': 'g-balloon-title' }, [
    h('h2', { class: 'g-title', id: 'g-balloon-title', text: 'Balloon Pop' }),
    h('p', { class: 'g-lead', text: 'Balloons are floating away! Press the letter on a balloon to pop it before it escapes.' }),
    h('ul', { class: 'g-howto' }, [
      h('li', { text: 'Press the key shown on any balloon to pop it.' }),
      h('li', { text: 'Word balloons: type all the letters in order.' }),
      h('li', { text: 'Pop balloons in a row to build a combo — up to 5x points.' }),
      h('li', { text: 'Wrong keys and escaped balloons reset your combo. You have 60 seconds.' })
    ]),
    h('div', { class: 'g-options' }, [
      chipGroup('Balloons carry', [
        { value: 'letters', label: 'Letters only' }, { value: 'mixed', label: 'Letters, then words' }
      ], opts.mode, function (v) { opts.mode = v; updateBestLine(); }),
      h('label', { class: 'g-check' }, [homeBox, 'Home row only (a s d f g h j k l)'])
    ]),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Start popping', onclick: startGame }),
    bestLine
  ]);

  /* ---------- DOM: play ---------- */
  var sScore = stat('Score'), sTime = stat('Time'), sCombo = stat('Combo'), sPops = stat('Popped');
  sCombo.b.classList.add('g-combo');
  var hud = h('div', { class: 'g-hud' }, [sScore.el, sTime.el, sCombo.el, sPops.el, h('div', { class: 'g-hud-actions' }, [
    h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Quit', onclick: quitGame })
  ])]);
  var field = h('div', { class: 'g-balloon-field' });
  var hint = h('p', { class: 'g-hint-keys' });
  var input = h('input', {
    type: 'text', class: 'g-input', 'aria-label': 'Press the letters on the balloons',
    autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false'
  });
  var overlay = h('div', { class: 'g-overlay', hidden: true }, [
    h('span', { class: 'g-overlay-title', text: 'Paused' }),
    h('button', { type: 'button', class: 'btn btn-primary', text: 'Click here to focus', onclick: focusInput }),
    h('p', { text: 'The clock stops while the play area is not focused.' })
  ]);
  var stage = h('div', { class: 'g-stage g-balloon-stage', 'aria-label': 'Balloon play area' }, [field, input, overlay]);
  var playScreen = h('section', { hidden: true, 'aria-label': 'Balloon Pop in progress' }, [hud, stage, hint]);
  var resultScreen = h('section', { class: 'g-panel g-result', hidden: true, 'aria-live': 'polite' });

  root.textContent = '';
  root.appendChild(startScreen);
  root.appendChild(playScreen);
  root.appendChild(resultScreen);
  updateBestLine();

  function updateBestLine() {
    var b = best[bestKey()];
    bestLine.textContent = '';
    if (b && b.score) {
      bestLine.appendChild(document.createTextNode('Personal best for this setup: '));
      bestLine.appendChild(h('b', { text: b.score + ' points' }));
    } else {
      bestLine.textContent = 'No personal best for this setup yet.';
    }
  }
  function show(screen) { [startScreen, playScreen, resultScreen].forEach(function (s) { s.hidden = s !== screen; }); }
  function focusInput() { input.focus({ preventScroll: true }); }

  stage.addEventListener('mousedown', function (e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    focusInput();
  });
  stage.addEventListener('click', function (e) { if (!e.target.closest('button')) focusInput(); });
  input.addEventListener('focus', syncFocus);
  input.addEventListener('blur', syncFocus);
  input.addEventListener('input', onInput);
  input.addEventListener('paste', function (e) { e.preventDefault(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
  window.addEventListener('resize', measure);

  function syncFocus() {
    var focused = document.activeElement === input;
    stage.classList.toggle('is-focused', focused);
    if (S && S.running) { S.paused = !focused; overlay.hidden = focused; }
    else overlay.hidden = true;
  }
  function measure() {
    if (!S) return;
    S.sw = field.clientWidth;
    S.sh = field.clientHeight;
  }

  /* ---------- flow ---------- */
  function startGame() {
    stopLoop();
    field.textContent = '';
    S = {
      running: true, paused: false, elapsed: 0, last: performance.now(), sw: 0, sh: 0,
      letters: opts.home ? HOME_LETTERS : ALL_LETTERS, words: wordPool(),
      balloons: [], active: null, spawnIn: 0.2, colorIx: 0,
      score: 0, pops: 0, combo: 0, bestCombo: 0, keys: 0, goodKeys: 0, escaped: 0, level: 1
    };
    hint.textContent = (opts.home ? 'Home row: a s d f g h j k l — rest your index fingers on F and J.' : 'Press the letter on a balloon.') +
      (opts.mode === 'mixed' ? ' Word balloons appear from level 2: type the whole word.' : '');
    input.value = '';
    show(playScreen);
    measure();
    renderHud();
    focusInput();
    syncFocus();
    raf = requestAnimationFrame(loop);
  }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function quitGame() {
    stopLoop();
    S = null;
    field.textContent = '';
    input.blur();
    show(startScreen);
    updateBestLine();
  }

  function riseTime() { return Math.max(3.2, 7.5 * Math.pow(0.9, S.level - 1)); }
  function spawnGap() { return Math.max(0.45, 1.25 * Math.pow(0.9, S.level - 1)); }

  function spawnBalloon() {
    var useWord = opts.mode === 'mixed' && S.level >= 2 && Math.random() < Math.min(0.5, 0.25 + (S.level - 2) * 0.05);
    var used = {};
    S.balloons.forEach(function (b) { used[b.text[0]] = true; });
    var text = '';
    for (var i = 0; i < 12; i++) {
      text = useWord ? pick(S.words) : pick(S.letters);
      if (!used[text[0]]) break;
    }
    var typedEl = h('span', { class: 't' });
    var restEl = h('span', { text: text });
    var body = h('div', { class: 'g-balloon-body' }, [typedEl, restEl]);
    var el = h('div', { class: 'g-balloon' + (text.length > 1 ? ' is-word' : ''), 'aria-hidden': 'true' }, [body]);
    el.style.setProperty('--c', COLORS[S.colorIx++ % COLORS.length]);
    field.appendChild(el);
    var b = {
      text: text, el: el, typedEl: typedEl, restEl: restEl, progress: 0,
      bw: el.offsetWidth, bh: el.offsetHeight, xf: Math.random(), y: 0,
      speed: (1 / riseTime()) * (0.9 + Math.random() * 0.2) * (text.length > 1 ? 0.8 : 1),
      phase: Math.random() * Math.PI * 2
    };
    S.balloons.push(b);
    placeBalloon(b);
  }
  function placeBalloon(b) {
    var sway = reduceMotion ? 0 : Math.sin(S.elapsed * 1.6 + b.phase) * 8;
    b.x = 10 + b.xf * Math.max(0, S.sw - b.bw - 20) + sway;
    var start = S.sh, end = -b.bh * 1.8; // from just below the floor to fully above the top (incl. string)
    b.top = start + (end - start) * b.y;
    b.el.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.top.toFixed(1) + 'px)';
  }

  function loop(now) {
    if (!S) return;
    var dt = Math.min(1, (now - S.last) / 1000);
    S.last = now;
    if (S.running && !S.paused) {
      S.elapsed += dt;
      S.spawnIn -= dt;
      if (S.spawnIn <= 0 && S.balloons.length < 3 + S.level) { spawnBalloon(); S.spawnIn = spawnGap(); }
      for (var i = S.balloons.length - 1; i >= 0; i--) {
        var b = S.balloons[i];
        b.y += b.speed * dt;
        if (b.y >= 1) { escape(b); continue; }
        placeBalloon(b);
      }
      renderHud();
      if (S.elapsed >= ROUND) { endGame(); return; }
    }
    raf = requestAnimationFrame(loop);
  }

  function removeBalloon(b) {
    var i = S.balloons.indexOf(b);
    if (i >= 0) S.balloons.splice(i, 1);
    if (S.active === b) S.active = null;
  }
  function escape(b) {
    removeBalloon(b);
    b.el.remove();
    S.escaped++;
    S.combo = 0;
  }
  function multiplier() { return Math.min(5, 1 + Math.floor(S.combo / 5)); }
  function pop(b) {
    removeBalloon(b);
    S.combo++;
    S.bestCombo = Math.max(S.bestCombo, S.combo);
    var pts = 10 * b.text.length * multiplier();
    S.score += pts;
    S.pops++;
    S.level = Math.min(10, 1 + Math.floor(S.pops / 8));
    b.el.classList.add('is-pop');
    removeAfterAnim(b.el, 350);
    if (!reduceMotion) {
      var f = h('div', { class: 'g-float-score', text: '+' + pts, 'aria-hidden': 'true' });
      f.style.left = (b.x + b.bw / 2 - 12) + 'px';
      f.style.top = Math.max(4, b.top) + 'px';
      field.appendChild(f);
      removeAfterAnim(f, 900);
    }
  }
  function miss() {
    S.combo = 0;
    stage.classList.add('is-hit');
    setTimeout(function () { stage.classList.remove('is-hit'); }, 250);
  }
  function setText(b) {
    b.typedEl.textContent = b.text.slice(0, b.progress);
    b.restEl.textContent = b.text.slice(b.progress);
  }

  /* ---------- typing ---------- */
  function onInput() {
    var v = input.value.toLowerCase();
    input.value = '';
    if (!S || !S.running || S.paused) return;
    for (var i = 0; i < v.length; i++) {
      if (/[a-z]/.test(v[i])) handleKey(v[i]);
    }
    renderHud();
  }

  function handleKey(c) {
    S.keys++;
    var t = S.active;
    if (t) {
      if (t.text[t.progress] === c) {
        S.goodKeys++;
        t.progress++;
        if (t.progress >= t.text.length) pop(t); else setText(t);
        return;
      }
      // Wrong next letter: drop the partly typed word and try a fresh match below.
      t.progress = 0; setText(t); t.el.classList.remove('is-target'); S.active = null;
    }
    var cand = null;
    S.balloons.forEach(function (b) {
      if (b.text[0] === c && (!cand || b.y > cand.y)) cand = b; // highest balloon = most urgent
    });
    if (!cand) { miss(); return; }
    S.goodKeys++;
    if (cand.text.length === 1) { pop(cand); return; }
    cand.progress = 1;
    setText(cand);
    cand.el.classList.add('is-target');
    S.active = cand;
  }

  function renderHud() {
    sScore.set(S.score);
    var left = Math.max(0, Math.ceil(ROUND - S.elapsed));
    sTime.set(left + 's');
    sTime.el.classList.toggle('is-warn', left <= 10);
    sCombo.set('x' + multiplier());
    sPops.set(S.pops);
  }

  /* ---------- end ---------- */
  function endGame() {
    var st = S;
    st.running = false;
    stopLoop();
    input.blur();
    var key = bestKey();
    var prev = best[key];
    var isBest = st.score > 0 && (!prev || st.score > prev.score);
    if (isBest) { best[key] = { score: st.score, combo: st.bestCombo }; saveBest(best); }
    var acc = st.keys ? Math.round(st.goodKeys / st.keys * 100) : 100;

    var heading = h('h2', { tabindex: '-1', text: "Time's up!" });
    resultScreen.textContent = '';
    resultScreen.appendChild(heading);
    resultScreen.appendChild(h('p', { class: 'g-result-sub', text: (opts.mode === 'mixed' ? 'Letters & words' : 'Letters only') + (opts.home ? ' · home row' : '') }));
    if (isBest) resultScreen.appendChild(h('p', { class: 'g-pb' }, [h('span', { class: 'badge badge-success', text: 'New personal best!' })]));
    resultScreen.appendChild(h('div', { class: 'g-result-grid' }, [
      resultItem(st.score, 'Score', true),
      resultItem(st.pops, 'Balloons popped'),
      resultItem(acc + '%', 'Accuracy'),
      resultItem(st.bestCombo, 'Best streak'),
      resultItem(st.escaped, 'Escaped'),
      resultItem(best[key] ? best[key].score : 0, 'Best score')
    ]));
    resultScreen.appendChild(h('div', { class: 'g-actions' }, [
      h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Play again', onclick: startGame }),
      h('button', { type: 'button', class: 'btn btn-outline btn-lg', text: 'Change settings', onclick: function () { show(startScreen); updateBestLine(); } })
    ]));
    S = null;
    field.textContent = '';
    show(resultScreen);
    heading.focus();
  }
})();
