/* TypingTestKaro — Keyboard Ninja
   Key-finder for beginners: a key lights up on an on-screen keyboard, colour-coded by the
   finger that should press it. Press it as fast as you can. */
(function () {
  'use strict';

  var SLUG = 'keyboard-ninja';
  var root = document.querySelector('#game-root[data-game="' + SLUG + '"]');
  if (!root) return;

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
  function keyLabel(k) { return k.toUpperCase(); }

  /* ---------- keyboard + finger data ---------- */
  // Finger colours are game-art: mid-tone hues read well with dark text in both themes.
  var FINGERS = {
    lp: { label: 'Left pinky', color: '#f87171', keys: '1qaz' },
    lr: { label: 'Left ring', color: '#fb923c', keys: '2wsx' },
    lm: { label: 'Left middle', color: '#facc15', keys: '3edc' },
    li: { label: 'Left index', color: '#4ade80', keys: '45rtfgvb' },
    ri: { label: 'Right index', color: '#22d3ee', keys: '67yuhjnm' },
    rm: { label: 'Right middle', color: '#60a5fa', keys: '8ik,' },
    rr: { label: 'Right ring', color: '#a78bfa', keys: '9ol.' },
    rp: { label: 'Right pinky', color: '#f472b6', keys: '0p;/' },
    th: { label: 'Thumbs', color: '#94a3b8', keys: ' ' }
  };
  var FINGER_OF = {};
  Object.keys(FINGERS).forEach(function (f) { FINGERS[f].keys.split('').forEach(function (k) { FINGER_OF[k] = f; }); });

  // Rows on a 45-column grid (each key = 4 columns) so the stagger scales with width.
  var ROWS = [
    { keys: '1234567890', start: 1 },
    { keys: 'qwertyuiop', start: 3 },
    { keys: 'asdfghjkl;', start: 4 },
    { keys: 'zxcvbnm,./', start: 6 }
  ];
  var MODES = {
    home: { label: 'Home row', keys: 'asdfghjkl' },
    top: { label: 'Top row', keys: 'qwertyuiop' },
    bottom: { label: 'Bottom row', keys: 'zxcvbnm' },
    letters: { label: 'All letters', keys: 'abcdefghijklmnopqrstuvwxyz' },
    numbers: { label: 'Numbers', keys: '1234567890' }
  };

  var opts = { mode: 'home', dur: 60 };
  var best = loadBest();
  var S = null;
  var raf = 0;

  /* ---------- DOM: start ---------- */
  var bestLine = h('p', { class: 'g-best-line' });
  var startScreen = h('section', { class: 'g-panel g-start', 'aria-labelledby': 'g-ninja-title' }, [
    h('h2', { class: 'g-title', id: 'g-ninja-title', text: 'Keyboard Ninja' }),
    h('p', { class: 'g-lead', text: 'Learn where every key lives. A key lights up in the colour of the finger that should press it.' }),
    h('ul', { class: 'g-howto' }, [
      h('li', { text: 'Rest your fingers on the home row: A S D F and J K L ;' }),
      h('li', { text: 'Press the glowing key with the finger shown — faster presses score more.' }),
      h('li', { text: 'Try not to look down at your keyboard!' })
    ]),
    h('div', { class: 'g-options' }, [
      chipGroup('Keys', Object.keys(MODES).map(function (m) { return { value: m, label: MODES[m].label }; }), opts.mode,
        function (v) { opts.mode = v; updateBestLine(); }),
      chipGroup('Round length', [{ value: 30, label: '30 seconds' }, { value: 60, label: '60 seconds' }], opts.dur,
        function (v) { opts.dur = v; })
    ]),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Start training', onclick: startGame }),
    bestLine
  ]);

  /* ---------- DOM: play ---------- */
  var sTime = stat('Time'), sScore = stat('Score'), sAcc = stat('Accuracy'), sRt = stat('Avg reaction');
  var hud = h('div', { class: 'g-hud' }, [sTime.el, sScore.el, sAcc.el, sRt.el, h('div', { class: 'g-hud-actions' }, [
    h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Quit', onclick: quitGame })
  ])]);

  var promptKey = h('span', { class: 'g-ninja-key', 'aria-hidden': 'true' });
  var promptFinger = h('div', { class: 'g-ninja-finger' });
  var liveTarget = h('span', { class: 'sr-only', 'aria-live': 'polite' });
  var prompt = h('div', { class: 'g-ninja-prompt' }, [promptKey, promptFinger, liveTarget]);

  // Build on-screen keyboard
  var keyEls = {};
  var kb = h('div', { class: 'g-kb', 'aria-hidden': 'true' });
  ROWS.forEach(function (row) {
    var rowEl = h('div', { class: 'g-kb-row' });
    row.keys.split('').forEach(function (k, i) {
      var f = FINGER_OF[k];
      var el = h('div', { class: 'g-key' + (k === 'f' || k === 'j' ? ' is-bump' : ''), text: keyLabel(k) });
      el.style.setProperty('--f', FINGERS[f].color);
      if (i === 0) el.style.gridColumn = row.start + ' / span 4';
      keyEls[k] = el;
      rowEl.appendChild(el);
    });
    kb.appendChild(rowEl);
  });
  var spaceKey = h('div', { class: 'g-key g-space', text: 'space' });
  spaceKey.style.setProperty('--f', FINGERS.th.color);
  kb.appendChild(h('div', { class: 'g-kb-row g-space-row' }, [spaceKey]));

  // Finger legend
  var legendItems = {};
  function legendGroup(title, ids) {
    var list = h('ul', { class: 'g-legend-list' });
    ids.forEach(function (id) {
      var item = h('li', { class: 'g-legend-item' }, [h('i', { 'aria-hidden': 'true' }), FINGERS[id].label.replace(/^(Left|Right) /, '')]);
      item.style.setProperty('--f', FINGERS[id].color);
      legendItems[id] = item;
      list.appendChild(item);
    });
    return h('div', { class: 'g-legend-group' }, [h('h3', { text: title }), list]);
  }
  var legend = h('div', { class: 'g-legend' }, [
    legendGroup('Left hand', ['lp', 'lr', 'lm', 'li']),
    legendGroup('Right hand', ['ri', 'rm', 'rr', 'rp']),
    legendGroup('Both hands', ['th'])
  ]);

  var input = h('input', {
    type: 'text', class: 'g-input', 'aria-label': 'Press the highlighted key',
    autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false'
  });
  var overlay = h('div', { class: 'g-overlay', hidden: true }, [
    h('span', { class: 'g-overlay-title', text: 'Paused' }),
    h('button', { type: 'button', class: 'btn btn-primary', text: 'Click here to focus', onclick: focusInput }),
    h('p', { text: 'The clock stops while the game is not focused.' })
  ]);
  var stage = h('div', { class: 'g-stage g-ninja-stage', 'aria-label': 'Keyboard Ninja play area' }, [prompt, kb, legend, input, overlay]);
  var playScreen = h('section', { hidden: true, 'aria-label': 'Keyboard Ninja in progress' }, [hud, stage]);
  var resultScreen = h('section', { class: 'g-panel g-result', hidden: true, 'aria-live': 'polite' });

  root.textContent = '';
  root.appendChild(startScreen);
  root.appendChild(playScreen);
  root.appendChild(resultScreen);
  updateBestLine();

  function updateBestLine() {
    var b = best[opts.mode];
    bestLine.textContent = '';
    if (b && b.score) {
      bestLine.appendChild(document.createTextNode('Best on ' + MODES[opts.mode].label + ': '));
      bestLine.appendChild(h('b', { text: b.score + ' points' }));
      if (b.avg) bestLine.appendChild(document.createTextNode(' · ' + b.avg + ' ms average'));
    } else {
      bestLine.textContent = 'No personal best on ' + MODES[opts.mode].label + ' yet.';
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

  function syncFocus() {
    var focused = document.activeElement === input;
    stage.classList.toggle('is-focused', focused);
    if (S && S.running) { S.paused = !focused; overlay.hidden = focused; }
    else overlay.hidden = true;
  }

  /* ---------- flow ---------- */
  function startGame() {
    stopLoop();
    var modeKeys = MODES[opts.mode].keys;
    S = {
      running: true, paused: false, elapsed: 0, last: performance.now(), dur: opts.dur,
      pool: modeKeys.split(''), target: '', targetAt: 0,
      score: 0, hits: 0, misses: 0, streak: 0, bestStreak: 0, rts: [], perKey: {}, timers: []
    };
    // Dim keys that are not part of this mode.
    Object.keys(keyEls).forEach(function (k) {
      keyEls[k].className = 'g-key' + (k === 'f' || k === 'j' ? ' is-bump' : '') + (modeKeys.indexOf(k) < 0 ? ' is-off' : '');
    });
    spaceKey.classList.add('is-off');
    input.setAttribute('inputmode', opts.mode === 'numbers' ? 'numeric' : 'text');
    input.value = '';
    show(playScreen);
    nextTarget();
    renderHud();
    focusInput();
    syncFocus();
    raf = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (S) S.timers.forEach(clearTimeout);
  }
  function quitGame() {
    stopLoop();
    S = null;
    input.blur();
    show(startScreen);
    updateBestLine();
  }

  function loop(now) {
    if (!S) return;
    var dt = Math.min(1, (now - S.last) / 1000);
    S.last = now;
    if (S.running && !S.paused) {
      S.elapsed += dt;
      renderHud();
      if (S.elapsed >= S.dur) { endGame(); return; }
    }
    raf = requestAnimationFrame(loop);
  }

  function nextTarget() {
    if (S.target && keyEls[S.target]) keyEls[S.target].classList.remove('is-target');
    var k = S.target;
    while (k === S.target && S.pool.length > 1) k = S.pool[Math.floor(Math.random() * S.pool.length)];
    if (S.pool.length === 1) k = S.pool[0];
    S.target = k;
    S.targetAt = S.elapsed;
    var f = FINGER_OF[k];
    keyEls[k].classList.add('is-target');
    promptKey.textContent = keyLabel(k);
    promptKey.style.setProperty('--f', FINGERS[f].color);
    if (!reduceMotion) { promptKey.classList.remove('is-pulse'); void promptKey.offsetWidth; promptKey.classList.add('is-pulse'); }
    promptFinger.textContent = '';
    promptFinger.appendChild(document.createTextNode('Use your '));
    promptFinger.appendChild(h('b', { text: FINGERS[f].label.toLowerCase() }));
    promptFinger.appendChild(document.createTextNode(' finger'));
    liveTarget.textContent = 'Press ' + keyLabel(k) + ' with your ' + FINGERS[f].label.toLowerCase() + ' finger';
    Object.keys(legendItems).forEach(function (id) { legendItems[id].classList.toggle('is-active', id === f); });
  }

  function flashKey(k, cls) {
    var el = keyEls[k];
    if (!el) return;
    el.classList.add(cls);
    S.timers.push(setTimeout(function () { el.classList.remove(cls); }, 160));
  }

  /* ---------- typing ---------- */
  function onInput() {
    var v = input.value.toLowerCase();
    input.value = '';
    if (!S || !S.running || S.paused) return;
    for (var i = 0; i < v.length; i++) {
      if (!/\s/.test(v[i])) handleKey(v[i]);
    }
    renderHud();
  }

  function handleKey(c) {
    var t = S.target;
    var stats = S.perKey[t] || (S.perKey[t] = { n: 0, total: 0, miss: 0 });
    if (c === t) {
      var rt = Math.max(0, (S.elapsed - S.targetAt) * 1000);
      S.rts.push(rt);
      stats.n++; stats.total += rt;
      S.hits++;
      S.streak++;
      S.bestStreak = Math.max(S.bestStreak, S.streak);
      S.score += 10 + Math.max(0, Math.round((1200 - rt) / 60)); // up to +20 for fast presses
      flashKey(c, 'is-hit');
      nextTarget();
    } else {
      S.misses++;
      S.streak = 0;
      stats.miss++;
      flashKey(c, 'is-miss');
    }
  }

  function avgRt() {
    if (!S.rts.length) return 0;
    return Math.round(S.rts.reduce(function (a, b) { return a + b; }, 0) / S.rts.length);
  }
  function renderHud() {
    sTime.set(Math.max(0, Math.ceil(S.dur - S.elapsed)) + 's');
    sTime.el.classList.toggle('is-warn', S.dur - S.elapsed <= 10);
    sScore.set(S.score);
    var total = S.hits + S.misses;
    sAcc.set((total ? Math.round(S.hits / total * 100) : 100) + '%');
    sRt.set(S.rts.length ? avgRt() + 'ms' : '–');
  }

  /* ---------- end ---------- */
  function endGame() {
    var st = S;
    st.running = false;
    stopLoop();
    input.blur();
    if (keyEls[st.target]) keyEls[st.target].classList.remove('is-target');
    var total = st.hits + st.misses;
    var acc = total ? Math.round(st.hits / total * 100) : 0;
    var avg = avgRt();
    var fastest = st.rts.length ? Math.round(Math.min.apply(null, st.rts)) : 0;
    var prev = best[opts.mode];
    var isBest = st.score > 0 && (!prev || st.score > prev.score);
    if (isBest) { best[opts.mode] = { score: st.score, avg: avg }; saveBest(best); }

    // Keys to practise: most misses first, then slowest average.
    var weak = Object.keys(st.perKey).map(function (k) {
      var p = st.perKey[k];
      return { k: k, miss: p.miss, avg: p.n ? p.total / p.n : 9999 };
    }).filter(function (x) { return x.miss > 0 || x.avg > 700; })
      .sort(function (a, b) { return b.miss - a.miss || b.avg - a.avg; })
      .slice(0, 4);

    var heading = h('h2', { tabindex: '-1', text: "Time's up!" });
    resultScreen.textContent = '';
    resultScreen.appendChild(heading);
    resultScreen.appendChild(h('p', { class: 'g-result-sub', text: MODES[opts.mode].label + ' · ' + st.dur + ' seconds' }));
    if (isBest) resultScreen.appendChild(h('p', { class: 'g-pb' }, [h('span', { class: 'badge badge-success', text: 'New personal best!' })]));
    resultScreen.appendChild(h('div', { class: 'g-result-grid' }, [
      resultItem(st.score, 'Score', true),
      resultItem(st.hits, 'Keys hit'),
      resultItem(acc + '%', 'Accuracy'),
      resultItem(avg ? avg + 'ms' : '–', 'Avg reaction'),
      resultItem(fastest ? fastest + 'ms' : '–', 'Fastest'),
      resultItem(best[opts.mode] ? best[opts.mode].score : 0, 'Best score')
    ]));
    if (weak.length) {
      resultScreen.appendChild(h('p', { class: 'g-note', text: 'Keys to practise:' }));
      resultScreen.appendChild(h('div', { class: 'g-practice' }, weak.map(function (x) {
        return h('span', { class: 'badge badge-accent', text: keyLabel(x.k) + (x.miss ? ' · ' + x.miss + ' miss' + (x.miss > 1 ? 'es' : '') : ' · slow') });
      })));
    }
    resultScreen.appendChild(h('div', { class: 'g-actions' }, [
      h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Play again', onclick: startGame }),
      h('button', { type: 'button', class: 'btn btn-outline btn-lg', text: 'Change settings', onclick: function () { show(startScreen); updateBestLine(); } })
    ]));
    S = null;
    show(resultScreen);
    heading.focus();
  }
})();
