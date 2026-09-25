/* TypingTestKaro — Word Rain
   Words fall from the sky. Type one to destroy it before it hits the ground. */
(function () {
  'use strict';

  var SLUG = 'word-rain';
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
  /* Remove an element after its CSS animation (or immediately with reduced motion). */
  function removeAfterAnim(el, ms) {
    if (reduceMotion) { el.remove(); return; }
    var done = function () { el.remove(); };
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, ms || 600);
  }

  /* ---------- config ---------- */
  var DIFFS = {
    easy: { label: 'Easy', list: 'easy', fall: 1, fallback: ['cat', 'sun', 'map', 'red', 'box'] },
    medium: { label: 'Medium', list: 'medium', fall: 1.2, fallback: ['apple', 'house', 'river', 'green'] },
    hard: { label: 'Hard', list: 'hard', fall: 1.45, fallback: ['keyboard', 'language', 'mountain'] }
  };
  var MAX_LIVES = 5;
  var WORDS_PER_LEVEL = 10;

  var opts = { diff: 'easy' };
  var best = loadBest();

  var S = null;
  var raf = 0;

  /* ---------- DOM: start ---------- */
  var bestLine = h('p', { class: 'g-best-line' });
  var startScreen = h('section', { class: 'g-panel g-start', 'aria-labelledby': 'g-rain-title' }, [
    h('h2', { class: 'g-title', id: 'g-rain-title', text: 'Word Rain' }),
    h('p', { class: 'g-lead', text: 'Words are falling! Type each one before it reaches the ground.' }),
    h('ul', { class: 'g-howto' }, [
      h('li', { text: 'Just start typing — the game locks onto the word that matches your letters.' }),
      h('li', { text: 'Press Space to clear what you typed and pick another word.' }),
      h('li', { text: 'Every 10 words the level goes up and words fall faster.' }),
      h('li', { text: 'A word that hits the ground costs a life. You have 5.' })
    ]),
    h('div', { class: 'g-options' }, [
      chipGroup('Word difficulty', [
        { value: 'easy', label: 'Easy (short)' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard (long)' }
      ], opts.diff, function (v) { opts.diff = v; updateBestLine(); })
    ]),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Start game', onclick: startGame }),
    bestLine
  ]);

  /* ---------- DOM: play ---------- */
  var sScore = stat('Score'), sLevel = stat('Level'), sLives = stat('Lives'), sWords = stat('Words');
  sLives.b.classList.add('g-lives');
  var hud = h('div', { class: 'g-hud' }, [sScore.el, sLevel.el, sLives.el, sWords.el, h('div', { class: 'g-hud-actions' }, [
    h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Quit', onclick: quitGame })
  ])]);
  var field = h('div', { class: 'g-rain-field' });
  var typedBar = h('div', { class: 'g-rain-typed', 'aria-live': 'off' });
  var input = h('input', {
    type: 'text', class: 'g-input', 'aria-label': 'Type the falling words here',
    autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done'
  });
  var overlayTitle = h('span', { class: 'g-overlay-title', text: 'Paused' });
  var overlay = h('div', { class: 'g-overlay', hidden: true }, [
    overlayTitle,
    h('button', { type: 'button', class: 'btn btn-primary', text: 'Click here to focus', onclick: focusInput }),
    h('p', { text: 'The game pauses whenever the play area loses focus.' })
  ]);
  var stage = h('div', { class: 'g-stage g-rain-stage', 'aria-label': 'Word rain play area' }, [field, typedBar, input, overlay]);
  var playScreen = h('section', { hidden: true, 'aria-label': 'Word Rain in progress' }, [hud, stage]);
  var resultScreen = h('section', { class: 'g-panel g-result', hidden: true, 'aria-live': 'polite' });

  root.textContent = '';
  root.appendChild(startScreen);
  root.appendChild(playScreen);
  root.appendChild(resultScreen);
  updateBestLine();

  function updateBestLine() {
    var b = best[opts.diff];
    bestLine.textContent = '';
    if (b && b.score) {
      bestLine.appendChild(document.createTextNode('Best on ' + DIFFS[opts.diff].label + ': '));
      bestLine.appendChild(h('b', { text: b.score + ' points' }));
      bestLine.appendChild(document.createTextNode(' (level ' + b.level + ')'));
    } else {
      bestLine.textContent = 'No personal best on ' + DIFFS[opts.diff].label + ' yet.';
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
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearBuffer(); } });
  window.addEventListener('resize', measure);

  function syncFocus() {
    var focused = document.activeElement === input;
    stage.classList.toggle('is-focused', focused);
    if (S && S.running) { S.paused = !focused; overlay.hidden = focused; }
    else overlay.hidden = true;
  }
  function measure() {
    if (!S) return;
    S.fw = field.clientWidth;
    S.fh = field.clientHeight;
  }

  /* ---------- game flow ---------- */
  function startGame() {
    stopLoop();
    field.textContent = '';
    var d = DIFFS[opts.diff];
    var list = (W[d.list] && W[d.list].length) ? W[d.list] : d.fallback;
    S = {
      running: true, paused: false, list: list, diff: d,
      words: [], target: null, buffer: '',
      score: 0, level: 1, lives: MAX_LIVES, destroyed: 0, missed: 0,
      keys: 0, goodKeys: 0, spawnIn: 0.3, last: performance.now(), fw: 0, fh: 0, elapsed: 0
    };
    input.value = '';
    show(playScreen);
    measure();
    renderTyped();
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

  function fallTime() { return Math.max(3, 10 * Math.pow(0.9, S.level - 1)) * S.diff.fall; }
  function spawnGap() { return Math.max(0.75, 2.3 * Math.pow(0.9, S.level - 1)); }

  function spawnWord() {
    // Prefer a word whose first letter isn't already on screen (makes targeting clearer).
    var used = {}, onScreen = {};
    S.words.forEach(function (w) { used[w.text[0]] = true; onScreen[w.text] = true; });
    var text = pick(S.list);
    for (var i = 0; i < 12 && (used[text[0]] || onScreen[text]); i++) text = pick(S.list);
    if (onScreen[text]) return;

    var typedEl = h('span', { class: 't' });
    var restEl = h('span', { text: text });
    var el = h('span', { class: 'g-rain-word' }, [typedEl, restEl]);
    field.appendChild(el);
    var w = el.offsetWidth, hh = el.offsetHeight;
    var word = {
      text: text, el: el, typedEl: typedEl, restEl: restEl, w: w, h: hh,
      xf: Math.random(), y: 0,
      speed: (1 / fallTime()) * (0.9 + Math.random() * 0.2), danger: false
    };
    S.words.push(word);
    placeWord(word);
  }
  function placeWord(w) {
    var x = 4 + w.xf * Math.max(0, S.fw - w.w - 8);
    var y = w.y * Math.max(0, S.fh - w.h);
    w.tf = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    w.el.style.transform = w.tf;
  }

  function loop(now) {
    if (!S) return;
    var dt = Math.min(0.5, (now - S.last) / 1000);
    S.last = now;
    if (S.running && !S.paused) {
      S.elapsed += dt;
      S.spawnIn -= dt;
      if (S.spawnIn <= 0 && S.words.length < 4 + S.level) { spawnWord(); S.spawnIn = spawnGap(); }
      for (var i = S.words.length - 1; i >= 0; i--) {
        var w = S.words[i];
        w.y += w.speed * dt;
        if (!w.danger && w.y > 0.75) { w.danger = true; w.el.classList.add('is-danger'); }
        if (w.y >= 1) { missWord(w); if (!S) return; continue; }
        placeWord(w);
      }
    }
    if (S && S.running) raf = requestAnimationFrame(loop);
  }

  function removeWord(w) {
    var i = S.words.indexOf(w);
    if (i >= 0) S.words.splice(i, 1);
    if (S.target === w) { S.target = null; }
  }
  function missWord(w) {
    var wasTarget = S.target === w;
    removeWord(w);
    w.el.remove();
    S.lives--;
    S.missed++;
    if (wasTarget) clearBuffer();
    stage.classList.add('is-hit');
    setTimeout(function () { stage.classList.remove('is-hit'); }, 300);
    renderHud();
    if (S.lives <= 0) endGame();
  }
  function destroyWord(w) {
    removeWord(w);
    S.destroyed++;
    S.score += w.text.length * 10 * S.level;
    w.el.style.setProperty('--tf', w.tf);
    w.el.classList.add('is-boom');
    removeAfterAnim(w.el, 400);
    if (S.destroyed % WORDS_PER_LEVEL === 0) levelUp();
    renderHud();
  }
  function levelUp() {
    S.level++;
    var flash = h('div', { class: 'g-level-flash', text: 'Level ' + S.level });
    stage.appendChild(flash);
    removeAfterAnim(flash, 1500);
  }

  /* ---------- typing ---------- */
  function clearBuffer() {
    if (!S) return;
    S.buffer = '';
    input.value = '';
    setTarget(null);
    renderTyped();
  }
  function setTarget(w) {
    if (S.target && S.target !== w) {
      S.target.el.classList.remove('is-target');
      S.target.typedEl.textContent = '';
      S.target.restEl.textContent = S.target.text;
    }
    S.target = w;
    if (w) w.el.classList.add('is-target');
  }
  function findTarget(prefix) {
    var bestW = null;
    S.words.forEach(function (w) {
      if (w.text.indexOf(prefix) === 0 && (!bestW || w.y > bestW.y)) bestW = w; // lowest word first
    });
    return bestW;
  }

  function onInput() {
    if (!S || !S.running) { input.value = ''; return; }
    var v = input.value.toLowerCase();
    if (/\s/.test(v)) { clearBuffer(); return; } // space / enter clears the buffer

    var prev = S.buffer;
    if (v.length <= prev.length) {
      // Backspace: keep buffer in sync, re-evaluate target.
      S.buffer = v;
      setTarget(v ? (S.target && S.target.text.indexOf(v) === 0 ? S.target : findTarget(v)) : null);
      renderTyped();
      return;
    }

    // Process each newly typed character; invalid characters are rejected.
    var buf = prev;
    for (var i = prev.length; i < v.length; i++) {
      var next = buf + v[i];
      var t = (S.target && S.target.text.indexOf(next) === 0) ? S.target : findTarget(next);
      S.keys++;
      if (!t) {
        flashBad();
        continue;
      }
      S.goodKeys++;
      buf = next;
      setTarget(t);
      if (buf === t.text) {
        destroyWord(t);
        buf = '';
        setTarget(null);
        if (!S.running) break;
      }
    }
    S.buffer = buf;
    input.value = buf;
    renderTyped();
  }

  function flashBad() {
    typedBar.classList.remove('is-bad');
    void typedBar.offsetWidth; // restart animation
    typedBar.classList.add('is-bad');
    setTimeout(function () { typedBar.classList.remove('is-bad'); }, 260);
  }

  function renderTyped() {
    typedBar.textContent = '';
    if (!S) return;
    if (S.buffer) typedBar.appendChild(document.createTextNode(S.buffer));
    else typedBar.appendChild(h('span', { class: 'ph', text: 'Start typing a word…' }));
    typedBar.appendChild(h('span', { class: 'g-caret', 'aria-hidden': 'true' }));
    if (S.target) {
      var n = S.buffer.length;
      S.target.typedEl.textContent = S.target.text.slice(0, n);
      S.target.restEl.textContent = S.target.text.slice(n);
    }
  }

  function renderHud() {
    sScore.set(S.score);
    sLevel.set(S.level);
    var hearts = '';
    for (var i = 0; i < MAX_LIVES; i++) hearts += i < S.lives ? '♥' : '♡';
    sLives.set(hearts);
    sLives.b.setAttribute('aria-label', S.lives + ' lives left');
    sWords.set(S.destroyed);
  }

  /* ---------- end ---------- */
  function endGame() {
    var st = S;
    st.running = false;
    stopLoop();
    input.blur();
    var key = opts.diff;
    var prevBest = best[key];
    var isBest = !prevBest || st.score > prevBest.score;
    if (isBest) { best[key] = { score: st.score, level: st.level }; saveBest(best); }
    var acc = st.keys ? Math.round(st.goodKeys / st.keys * 100) : 100;

    var heading = h('h2', { tabindex: '-1', text: 'Game over' });
    resultScreen.textContent = '';
    resultScreen.appendChild(heading);
    resultScreen.appendChild(h('p', { class: 'g-result-sub', text: DIFFS[key].label + ' words · reached level ' + st.level }));
    if (isBest && st.score > 0) resultScreen.appendChild(h('p', { class: 'g-pb' }, [h('span', { class: 'badge badge-success', text: 'New personal best!' })]));
    resultScreen.appendChild(h('div', { class: 'g-result-grid' }, [
      resultItem(st.score, 'Score', true),
      resultItem(st.destroyed, 'Words typed'),
      resultItem(st.level, 'Level reached'),
      resultItem(acc + '%', 'Accuracy'),
      resultItem(st.missed, 'Missed'),
      resultItem(best[key] ? best[key].score : st.score, 'Best score')
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
