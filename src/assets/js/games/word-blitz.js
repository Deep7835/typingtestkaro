/* TypingTestKaro — Word Blitz
   Timed word sprint: type each word followed by Space, like a classic speed test. */
(function () {
  'use strict';

  var SLUG = 'word-blitz';
  var root = document.querySelector('#game-root[data-game="' + SLUG + '"]');
  if (!root) return;

  var W = window.TE_WORDS || {};
  var BEST_KEY = 'te_game_' + SLUG + '_best';

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
  function fmtTime(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

  /* ---------- config ---------- */
  var DIFFS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  var FALLBACK = ['the', 'and', 'type', 'fast', 'word', 'test', 'speed', 'good'];
  var opts = { dur: 60, diff: 'easy' };
  var best = loadBest();
  var S = null;
  var raf = 0;

  function bestKey() { return opts.dur + '_' + opts.diff; }
  function pool() {
    var list;
    if (opts.diff === 'hard') list = (W.hard || []).concat(W.medium || []); // long words mixed with medium
    else list = W[opts.diff] || [];
    return list.length ? list : FALLBACK;
  }

  /* ---------- DOM: start ---------- */
  var bestLine = h('p', { class: 'g-best-line' });
  var startScreen = h('section', { class: 'g-panel g-start', 'aria-labelledby': 'g-blitz-title' }, [
    h('h2', { class: 'g-title', id: 'g-blitz-title', text: 'Word Blitz' }),
    h('p', { class: 'g-lead', text: 'How many words can you type before the clock runs out?' }),
    h('ul', { class: 'g-howto' }, [
      h('li', { text: 'Type the highlighted word, then press Space to move on.' }),
      h('li', { text: 'Correct words turn green, wrong ones turn red. You cannot go back.' }),
      h('li', { text: 'The timer starts with your first key press.' })
    ]),
    h('div', { class: 'g-options' }, [
      chipGroup('Duration', [
        { value: 30, label: '30 seconds' }, { value: 60, label: '60 seconds' }, { value: 120, label: '120 seconds' }
      ], opts.dur, function (v) { opts.dur = v; updateBestLine(); }),
      chipGroup('Words', [
        { value: 'easy', label: 'Easy (2-4 letters)' }, { value: 'medium', label: 'Medium (5-7)' }, { value: 'hard', label: 'Hard (long)' }
      ], opts.diff, function (v) { opts.diff = v; updateBestLine(); })
    ]),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Start blitz', onclick: startGame }),
    bestLine
  ]);

  /* ---------- DOM: play ---------- */
  var sTime = stat('Time'), sWpm = stat('WPM'), sAcc = stat('Accuracy'), sWords = stat('Words');
  var hud = h('div', { class: 'g-hud' }, [sTime.el, sWpm.el, sAcc.el, sWords.el, h('div', { class: 'g-hud-actions' }, [
    h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Restart', onclick: function () { startGame(); } }),
    h('button', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Quit', onclick: quitGame })
  ])]);
  var wordsEl = h('div', { class: 'g-blitz-words', 'aria-label': 'Words to type' });
  var typedEl = h('div', { class: 'g-blitz-typed', 'aria-hidden': 'true' });
  var input = h('input', {
    type: 'text', class: 'g-input', 'aria-label': 'Type the highlighted word, then press space',
    autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'next'
  });
  var overlay = h('div', { class: 'g-overlay', hidden: true }, [
    h('span', { class: 'g-overlay-title', text: 'Paused' }),
    h('button', { type: 'button', class: 'btn btn-primary', text: 'Click here to focus', onclick: focusInput }),
    h('p', { text: 'The timer is paused until you focus the typing area.' })
  ]);
  var box = h('div', { class: 'g-blitz-box' }, [wordsEl, typedEl, input, overlay]);
  var playScreen = h('section', { hidden: true, 'aria-label': 'Word Blitz in progress' }, [hud, box]);
  var resultScreen = h('section', { class: 'g-panel g-result', hidden: true, 'aria-live': 'polite' });

  root.textContent = '';
  root.appendChild(startScreen);
  root.appendChild(playScreen);
  root.appendChild(resultScreen);
  updateBestLine();

  function updateBestLine() {
    var b = best[bestKey()];
    bestLine.textContent = '';
    if (b && b.wpm) {
      bestLine.appendChild(document.createTextNode('Best for ' + opts.dur + 's · ' + DIFFS[opts.diff] + ': '));
      bestLine.appendChild(h('b', { text: b.wpm + ' WPM' }));
      bestLine.appendChild(document.createTextNode(' at ' + b.acc + '% accuracy'));
    } else {
      bestLine.textContent = 'No personal best for ' + opts.dur + 's · ' + DIFFS[opts.diff] + ' yet.';
    }
  }
  function show(screen) { [startScreen, playScreen, resultScreen].forEach(function (s) { s.hidden = s !== screen; }); }
  function focusInput() { input.focus({ preventScroll: true }); }

  box.addEventListener('mousedown', function (e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    focusInput();
  });
  box.addEventListener('click', function (e) { if (!e.target.closest('button')) focusInput(); });
  input.addEventListener('focus', syncFocus);
  input.addEventListener('blur', syncFocus);
  input.addEventListener('input', onInput);
  input.addEventListener('paste', function (e) { e.preventDefault(); });
  input.addEventListener('keydown', function (e) {
    // Enter behaves like Space (handy on mobile keyboards).
    if (e.key === 'Enter') { e.preventDefault(); if (S && input.value) { input.value += ' '; onInput(); } }
  });

  function syncFocus() {
    var focused = document.activeElement === input;
    box.classList.toggle('is-focused', focused);
    if (S && S.active) { S.paused = !focused; overlay.hidden = focused; }
    else overlay.hidden = true;
  }

  /* ---------- words ---------- */
  function addWords(n) {
    var list = S.pool;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var w = pick(list);
      if (w === S.words[S.words.length - 1]) w = pick(list); // avoid immediate repeats
      var chars = [];
      var el = h('span', { class: 'g-bw' });
      for (var j = 0; j < w.length; j++) { var c = h('span', { class: 'c', text: w[j] }); chars.push(c); el.appendChild(c); }
      var extra = h('span', { class: 'x' });
      el.appendChild(extra);
      S.words.push(w);
      S.els.push({ el: el, chars: chars, extra: extra });
      frag.appendChild(el);
    }
    wordsEl.appendChild(frag);
  }

  /* ---------- flow ---------- */
  function startGame() {
    stopLoop();
    wordsEl.textContent = '';
    wordsEl.scrollTop = 0;
    S = {
      active: true, started: false, paused: false, elapsed: 0, last: 0, dur: opts.dur,
      pool: pool(), words: [], els: [], idx: 0, typed: '',
      keys: 0, goodKeys: 0, correctWords: 0, wrongWords: 0, correctChars: 0, scrollTop: 0
    };
    addWords(80);
    S.els[0].el.classList.add('is-cur');
    input.value = '';
    renderCurrent();
    sTime.set(fmtTime(S.dur)); sWpm.set('0'); sAcc.set('100%'); sWords.set('0');
    sTime.el.classList.remove('is-warn');
    show(playScreen);
    focusInput();
    syncFocus();
    S.last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
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
    if (S.started && !S.paused) {
      S.elapsed += dt;
      var left = S.dur - S.elapsed;
      sTime.set(fmtTime(left));
      sTime.el.classList.toggle('is-warn', left <= 10);
      if (S.elapsed >= 2) sWpm.set(Math.round((S.correctChars / 5) / (S.elapsed / 60)));
      if (left <= 0) { endGame(); return; }
    }
    raf = requestAnimationFrame(loop);
  }

  /* ---------- typing ---------- */
  function onInput() {
    if (!S || !S.active) { input.value = ''; return; }
    var v = input.value.replace(/ /g, ' ');
    var sp = v.search(/\s/);

    if (sp === 0) { input.value = v.replace(/^\s+/, ''); return; } // ignore leading spaces
    if (!S.started && v.length) S.started = true;

    var typed = sp > 0 ? v.slice(0, sp) : v;
    countKeys(typed);
    S.typed = typed;

    if (sp > 0) {
      // Space pressed: the space itself is a keystroke, correct only if the word was right.
      S.keys++;
      if (typed === S.words[S.idx]) S.goodKeys++;
      submitWord(typed);
      var rest = v.slice(sp + 1).replace(/^\s+/, '');
      input.value = rest;
      S.typed = '';
      if (rest) { onInput(); return; }
    }
    renderCurrent();
    sAcc.set((S.keys ? Math.round(S.goodKeys / S.keys * 100) : 100) + '%');
  }

  /* Count each newly added character as a keystroke (right or wrong). */
  function countKeys(typed) {
    var prev = S.typed, word = S.words[S.idx];
    if (typed.length <= prev.length) return;
    var from = typed.slice(0, prev.length) === prev ? prev.length : typed.length - 1;
    for (var i = from; i < typed.length; i++) {
      S.keys++;
      if (typed[i] === word[i]) S.goodKeys++;
    }
  }

  function submitWord(typed) {
    var word = S.words[S.idx], ref = S.els[S.idx];
    var ok = typed === word;
    ref.chars.forEach(function (c) { c.className = 'c'; });
    ref.extra.textContent = '';
    ref.extra.className = 'x';
    ref.el.className = 'g-bw ' + (ok ? 'is-ok' : 'is-bad');
    ref.el.setAttribute('aria-label', word + (ok ? ' correct' : ' incorrect'));
    if (ok) { S.correctWords++; S.correctChars += word.length + 1; } else { S.wrongWords++; }
    S.idx++;
    if (S.idx > S.words.length - 30) addWords(60);
    S.els[S.idx].el.classList.add('is-cur');
    sWords.set(S.correctWords);
    scrollToCurrent();
  }

  function renderCurrent() {
    var word = S.words[S.idx], ref = S.els[S.idx], t = S.typed;
    for (var i = 0; i < ref.chars.length; i++) {
      var cls = 'c';
      if (i < t.length) cls += t[i] === word[i] ? ' ok' : ' bad';
      if (i === t.length) cls += ' caret';
      if (ref.chars[i].className !== cls) ref.chars[i].className = cls;
    }
    ref.extra.textContent = t.length > word.length ? t.slice(word.length) : '';
    ref.el.classList.toggle('caret-end', t.length >= word.length);

    // Mirror of what's been typed, so mobile users can see their input.
    typedEl.textContent = '';
    if (t) {
      typedEl.classList.toggle('is-bad', word.indexOf(t) !== 0);
      typedEl.appendChild(document.createTextNode(t));
      typedEl.appendChild(h('span', { class: 'g-caret' }));
    } else {
      typedEl.classList.remove('is-bad');
      typedEl.appendChild(h('span', { class: 'ph', text: S.started ? 'Keep going…' : 'Start typing — the timer begins with your first key.' }));
    }
  }

  /* Keep the current word on the first or second visible line. */
  function scrollToCurrent() {
    var el = S.els[S.idx].el;
    var lh = parseFloat(getComputedStyle(wordsEl).lineHeight) || 32;
    var top = Math.max(0, el.offsetTop - lh);
    if (Math.abs(top - S.scrollTop) > 2) { S.scrollTop = top; wordsEl.scrollTop = top; }
  }

  /* ---------- end ---------- */
  function endGame() {
    var st = S;
    st.active = false;
    stopLoop();
    input.blur();
    var wpm = Math.round((st.correctChars / 5) / (st.dur / 60));
    var acc = st.keys ? Math.round(st.goodKeys / st.keys * 100) : 0;
    var key = bestKey();
    var prev = best[key];
    var isBest = wpm > 0 && (!prev || wpm > prev.wpm);
    if (isBest) { best[key] = { wpm: wpm, acc: acc }; saveBest(best); }

    var heading = h('h2', { tabindex: '-1', text: "Time's up!" });
    resultScreen.textContent = '';
    resultScreen.appendChild(heading);
    resultScreen.appendChild(h('p', { class: 'g-result-sub', text: st.dur + ' seconds · ' + DIFFS[opts.diff] + ' words' }));
    if (isBest) resultScreen.appendChild(h('p', { class: 'g-pb' }, [h('span', { class: 'badge badge-success', text: 'New personal best!' })]));
    resultScreen.appendChild(h('div', { class: 'g-result-grid' }, [
      resultItem(wpm, 'Words per minute', true),
      resultItem(acc + '%', 'Accuracy'),
      resultItem(st.correctWords, 'Correct words'),
      resultItem(st.wrongWords, 'Incorrect words'),
      resultItem(st.goodKeys + '/' + st.keys, 'Correct keystrokes'),
      resultItem(best[key] ? best[key].wpm : 0, 'Best WPM')
    ]));
    resultScreen.appendChild(h('p', { class: 'g-note', text: 'WPM counts only correctly typed words (5 characters = 1 word, spaces included).' }));
    resultScreen.appendChild(h('div', { class: 'g-actions' }, [
      h('button', { type: 'button', class: 'btn btn-primary btn-lg', text: 'Play again', onclick: startGame }),
      h('button', { type: 'button', class: 'btn btn-outline btn-lg', text: 'Change settings', onclick: function () { show(startScreen); updateBestLine(); } })
    ]));
    S = null;
    show(resultScreen);
    heading.focus();
  }
})();
