/* TypingTestKaro — course lesson player (key-by-key, stop on error). */
(function () {
  "use strict";
  var L = window.TE_LESSON, H = window.TEHindi, TE = window.TE;
  var root = document.getElementById("lesson-player");
  if (!L || !root || !TE) return;

  var hi = L.lang === "hi";
  var items = L.items;
  var FN = TE.FINGER_NAMES;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function keyLabel(ch) {
    if (ch === " ") return "Space";
    if (!hi) return ch;
    var out = L.layout === "inscript" ? H.INSCRIPT[ch] : H.remingtonLabel(ch);
    return ch + (out && out !== ch ? " → " + out : "");
  }
  function keyName(ch) {
    if (ch === " ") return "␣";
    return ch;
  }

  var state;
  function reset() {
    state = { item: 0, pos: 0, correct: 0, errors: 0, start: 0, done: false };
    render();
  }

  function seq(i) { return items[i].k + (i < items.length - 1 ? " " : ""); }

  function render() {
    var html = '<div class="lp">' +
      '<div class="lp-top"><div class="lp-stats">' +
        '<span class="badge badge-primary" data-s="prog">0 / ' + items.length + "</span>" +
        '<span class="badge" data-s="wpm">0 WPM</span>' +
        '<span class="badge" data-s="acc">100% accuracy</span>' +
        '<span class="badge badge-danger" data-s="err">0 errors</span>' +
      '</div><button type="button" class="btn btn-outline btn-sm" data-a="restart">↻ Restart</button></div>' +
      '<div class="lp-text" tabindex="0"' + (hi ? ' lang="hi"' : "") + ">";
    items.forEach(function (it, i) {
      if (hi) html += '<span class="lp-item" data-i="' + i + '">' + esc(it.d) + "</span>";
      else {
        html += '<span class="lp-item" data-i="' + i + '">';
        for (var c = 0; c < it.d.length; c++) html += '<span class="c">' + esc(it.d[c]) + "</span>";
        html += "</span>";
      }
    });
    html += '<input class="lp-hidden-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Type here">' +
      '<div class="lp-blur-hint">Click here to continue typing</div></div>' +
      '<div class="lp-caret-hint"><span>' + (hi ? 'Keys for this word: <span class="lp-keys" data-s="keys"></span>' : "Type the highlighted letters. Wrong keys won't advance.") + "</span>" +
      '<span>Next key: <span class="lp-next-key" data-s="next"></span> <span class="muted" data-s="finger"></span></span></div>' +
      '<div class="lp-kb"></div>' +
      '<div class="finger-legend"><span><i style="background:#e25b8f"></i>Pinky</span><span><i style="background:#f0a33a"></i>Ring</span><span><i style="background:#3fb37f"></i>Middle</span><span><i style="background:#4b7bec"></i>Index</span><span><i style="background:#8e6cf0"></i>Thumb</span></div>' +
      "</div>";
    root.innerHTML = html;

    var box = root.querySelector(".lp-text");
    var input = root.querySelector(".lp-hidden-input");
    state.box = box; state.input = input;
    state.spans = box.querySelectorAll(".lp-item");
    state.kb = new TE.Keyboard(root.querySelector(".lp-kb"), L.layout);
    state.s = {};
    [].forEach.call(root.querySelectorAll("[data-s]"), function (n) { state.s[n.getAttribute("data-s")] = n; });

    box.addEventListener("click", function () { input.focus(); });
    input.addEventListener("focus", function () { box.classList.remove("blurred"); box.classList.add("focused"); });
    input.addEventListener("blur", function () { box.classList.add("blurred"); box.classList.remove("focused"); });
    input.addEventListener("keydown", onKey);
    input.addEventListener("input", function () {
      // Mobile soft keyboards send "Unidentified" keydowns: use the typed text instead (English only).
      var v = input.value; input.value = "";
      if (!hi && v) for (var i = 0; i < v.length; i++) press(v[i]);
    });
    root.querySelector('[data-a="restart"]').addEventListener("click", function () { reset(); focus(); });
    paint();
    focus();
  }

  function focus() { if (state.input) state.input.focus({ preventScroll: true }); }

  function onKey(e) {
    if (state.done || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Unidentified" || e.key === "Process") return;
    var ch = hi ? H.usChar(e) : (e.key && e.key.length === 1 ? e.key : null);
    if (ch == null) return;
    e.preventDefault();
    press(ch);
  }

  function press(ch) {
    if (state.done) return;
    var expect = seq(state.item)[state.pos];
    if (!state.start) state.start = Date.now();
    state.kb.flash(ch);
    if (ch === expect) {
      state.correct++;
      state.pos++;
      if (state.pos >= seq(state.item).length) {
        state.item++; state.pos = 0;
        if (state.item >= items.length) return finish();
      }
    } else {
      state.errors++;
      var span = state.spans[state.item];
      span.classList.remove("err"); void span.offsetWidth; span.classList.add("err");
      var wrong = state.kb.root.querySelector('[data-k="' + (ch === " " ? "Space" : TE.baseKey(ch).replace(/["\\]/g, "\\$&")) + '"]');
      if (wrong) { wrong.classList.add("vk-wrong"); setTimeout(function () { wrong.classList.remove("vk-wrong"); }, 250); }
    }
    paint();
  }

  function paint() {
    var i = state.item, spans = state.spans;
    for (var j = 0; j < spans.length; j++) {
      spans[j].classList.toggle("done", j < i);
      spans[j].classList.toggle("cur", j === i);
    }
    if (!hi && spans[i]) {
      var cs = spans[i].querySelectorAll(".c");
      for (var c = 0; c < cs.length; c++) {
        cs[c].className = "c" + (c < state.pos ? " c-done" : c === state.pos ? " c-cur" : "");
      }
      if (i > 0) [].forEach.call(spans[i - 1].querySelectorAll(".c"), function (n) { n.className = "c"; });
    }
    var s = seq(i) || "";
    var next = s[state.pos];
    if (hi && state.s.keys) {
      var k = items[i] ? items[i].k : "";
      var h = "";
      for (var x = 0; x < k.length; x++) h += '<kbd class="' + (x < state.pos ? "k-done" : x === state.pos ? "k-cur" : "") + '">' + esc(keyName(k[x])) + "</kbd> ";
      if (state.pos >= k.length) h += '<kbd class="k-cur">␣</kbd>';
      state.s.keys.innerHTML = h;
    }
    if (next != null) {
      var f = state.kb.highlight(next);
      state.s.next.textContent = keyLabel(next);
      state.s.finger.textContent = "(" + FN[f] + (next !== " " && next !== next.toLowerCase() || /[~!@#$%^&*()_+{}|:"<>?]/.test(next) ? " + Shift" : "") + ")";
    }
    // stats
    var min = state.start ? (Date.now() - state.start) / 60000 : 0;
    var wpm = min > 0.02 ? Math.round(state.correct / 5 / min) : 0;
    var acc = state.correct + state.errors ? Math.round(state.correct / (state.correct + state.errors) * 100) : 100;
    state.s.prog.textContent = Math.min(i, items.length) + " / " + items.length;
    state.s.wpm.textContent = wpm + " WPM";
    state.s.acc.textContent = acc + "% accuracy";
    state.s.err.textContent = state.errors + " errors";
    // keep current item visible
    var cur = spans[i];
    if (cur) {
      var box = state.box, top = cur.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - cur.offsetHeight) box.scrollTop = Math.max(0, top - 20);
    }
  }

  function finish() {
    state.done = true;
    var min = Math.max((Date.now() - state.start) / 60000, 1 / 60);
    var wpm = Math.round(state.correct / 5 / min);
    var acc = Math.round(state.correct / (state.correct + state.errors) * 100);
    var stars = acc >= 97 && wpm >= L.target ? 3 : acc >= 92 && wpm >= L.target * 0.7 ? 2 : 1;
    var key = "te_lesson_" + L.course + ":" + L.lesson, prev = TE.store(key);
    if (!prev || stars > prev.stars || (stars === prev.stars && wpm > prev.wpm)) TE.store(key, { stars: stars, wpm: wpm, acc: acc, t: Date.now() });

    var msg = stars === 3 ? "Excellent! You've mastered this lesson." : stars === 2 ? "Good work! Repeat once more for 3 stars." :
      acc < 92 ? "Slow down a little and focus on accuracy — speed will come." : "Nice! Now try to reach the target speed of " + L.target + " WPM.";
    state.kb.clear();
    root.querySelector(".lp").insertAdjacentHTML("beforeend",
      '<div class="lp-done" tabindex="-1"><div class="stars" aria-label="' + stars + ' stars">' + "★★★".slice(0, stars) + '<span style="opacity:.25">' + "★★★".slice(0, 3 - stars) + "</span></div>" +
      "<h3>Lesson complete</h3><p class=\"muted\">" + msg + "</p>" +
      '<div class="chips" style="justify-content:center"><span class="badge badge-primary">' + wpm + " WPM</span><span class=\"badge badge-success\">" + acc + "% accuracy</span><span class=\"badge\">" + state.errors + " errors</span><span class=\"badge\">Target " + L.target + " WPM</span></div>" +
      '<div class="row mt-3" style="justify-content:center"><button type="button" class="btn btn-outline" data-a="again">↻ Practise again</button>' +
      (L.next ? '<a class="btn btn-primary" href="' + L.next + '">Next lesson →</a>' : '<a class="btn btn-primary" href="' + L.back + '">Back to course</a>') + "</div></div>");
    var done = root.querySelector(".lp-done");
    done.querySelector('[data-a="again"]').addEventListener("click", function () { reset(); });
    done.focus();
  }

  reset();
})();
