/*
 * TypingTestKaro — dictation (audio) typing test.
 * The passage is read aloud with the browser's speech synthesis at a chosen
 * dictation speed; the candidate types what they hear, then checks the transcript.
 */
(function () {
  "use strict";
  var root = document.getElementById("dictation");
  var TE = window.TE, H = window.TEHindi, P = window.TE_PASSAGES || {};
  if (!root || !TE) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; });
  }
  var synth = window.speechSynthesis;
  var supported = !!(synth && window.SpeechSynthesisUtterance);

  root.innerHTML =
    '<div class="tt">' +
      (supported ? "" : '<div class="callout warn mb-2"><strong>Speech not available</strong>Your browser does not support text-to-speech. Try Chrome or Edge on a computer.</div>') +
      '<div class="tt-toolbar">' +
        '<label class="tt-field"><span>Language / Layout</span><select class="input" data-d="layout">' +
          '<option value="qwerty">English</option><option value="remington">Hindi — Remington GAIL / Krutidev</option><option value="inscript">Hindi — Mangal Inscript</option><option value="ime">Hindi — my own Hindi keyboard</option></select></label>' +
        '<label class="tt-field"><span>Passage</span><select class="input" data-d="passage"></select></label>' +
        '<label class="tt-field"><span>Dictation speed</span><select class="input" data-d="speed"><option value="40">40 words/min</option><option value="60" selected>60 words/min</option><option value="80">80 words/min</option><option value="100">100 words/min</option></select></label>' +
        '<label class="tt-field"><span>Voice</span><select class="input" data-d="voice"></select></label>' +
      "</div>" +
      '<div class="row mb-2"><button class="btn btn-primary" type="button" data-d="play">▶ Start dictation</button>' +
        '<button class="btn btn-outline" type="button" data-d="pause" disabled>❚❚ Pause</button>' +
        '<button class="btn btn-outline" type="button" data-d="stop" disabled>■ Stop</button>' +
        '<span class="badge" data-d="status">Ready</span></div>' +
      '<div class="tt-prog mb-2"><i data-d="prog"></i></div>' +
      '<textarea class="tt-input" data-d="input" rows="8" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="Type what you hear…" aria-label="Type the dictation here"></textarea>' +
      '<div class="tt-actions"><button class="btn btn-outline" type="button" data-d="reveal">Show passage</button><button class="btn btn-primary" type="button" data-d="check">Check my transcript</button></div>' +
      '<div class="tt-passage-wrap hide mt-2" data-d="passageBox"><div class="tt-passage" data-d="passageText" style="height:auto;max-height:14em"></div></div>' +
      '<div class="tt-result hide" data-d="result"></div>' +
    "</div>";

  var el = {};
  [].forEach.call(root.querySelectorAll("[data-d]"), function (n) { el[n.getAttribute("data-d")] = n; });

  var layout = "qwerty", adapter = null;
  function lang() { return layout === "qwerty" ? "en" : "hi"; }

  function fillPassages() {
    var list = P[lang()] || [];
    el.passage.innerHTML = list.map(function (p) { return '<option value="' + p.id + '">' + esc(p.title) + " · " + esc(p.topic) + "</option>"; }).join("");
    el.passage.selectedIndex = Math.floor(Math.random() * list.length);
    el.input.setAttribute("lang", lang());
    root.firstChild.classList.toggle("tt-hi", lang() === "hi");
    fillVoices();
  }
  function passage() {
    var id = el.passage.value;
    return (P[lang()] || []).filter(function (p) { return p.id === id; })[0];
  }
  function fillVoices() {
    if (!supported) return;
    var want = lang() === "en" ? /^en/i : /^hi/i;
    var voices = synth.getVoices().filter(function (v) { return want.test(v.lang); });
    el.voice.innerHTML = voices.length
      ? voices.map(function (v, i) { return '<option value="' + i + '">' + esc(v.name) + " (" + v.lang + ")</option>"; }).join("")
      : '<option value="">Default voice</option>';
    el.voice._voices = voices;
  }
  if (supported) synth.onvoiceschanged = fillVoices;

  function makeAdapter() {
    adapter = new TE.InputAdapter(el.input, {
      layout: layout === "ime" ? "inscript" : layout, useIME: layout === "ime", backspace: true, onChange: function () {}
    });
  }
  el.layout.addEventListener("change", function () {
    stop();
    layout = this.value;
    var fresh = el.input.cloneNode(false);
    el.input.parentNode.replaceChild(fresh, el.input);
    el.input = fresh;
    makeAdapter();
    fillPassages();
    reset();
  });

  /* ---------- playback ---------- */
  var chunks = [], idx = 0, playing = false, paused = false, timer = null;
  function reset() {
    el.result.classList.add("hide");
    el.passageBox.classList.add("hide");
    el.input.value = "";
    if (adapter) adapter.reset();
    el.prog.style.width = "0%";
  }
  function buildChunks() {
    var words = H.normalize(passage().text).split(" "), out = [], cur = [];
    words.forEach(function (w) {
      cur.push(w);
      if (cur.length >= 6 || /[.।?!;,]$/.test(w) && cur.length >= 3) { out.push(cur.join(" ")); cur = []; }
    });
    if (cur.length) out.push(cur.join(" "));
    return out;
  }
  function status(t) { el.status.textContent = t; }
  function speakNext() {
    if (!playing || paused) return;
    if (idx >= chunks.length) { finishPlayback(); return; }
    var text = chunks[idx], words = text.split(" ").length;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang() === "en" ? "en-IN" : "hi-IN";
    var v = el.voice._voices && el.voice._voices[parseInt(el.voice.value, 10)];
    if (v) u.voice = v;
    var target = parseInt(el.speed.value, 10);
    u.rate = target <= 60 ? 0.85 : target <= 80 ? 0.95 : 1.05;
    var started = Date.now();
    u.onend = function () {
      if (!playing) return;
      idx++;
      el.prog.style.width = (idx / chunks.length * 100) + "%";
      // pause so the overall pace matches the chosen dictation speed
      var spent = Date.now() - started, wait = Math.max(150, words / target * 60000 - spent);
      timer = setTimeout(speakNext, wait);
    };
    synth.speak(u);
    status("Dictating… " + (idx + 1) + " / " + chunks.length);
  }
  function finishPlayback() {
    playing = false;
    status("Dictation finished — complete your typing, then check");
    el.play.disabled = false; el.pause.disabled = true; el.stop.disabled = true;
  }
  function stop() {
    playing = false; paused = false;
    clearTimeout(timer);
    if (supported) synth.cancel();
    el.play.disabled = false; el.pause.disabled = true; el.stop.disabled = true;
    el.pause.textContent = "❚❚ Pause";
    status("Stopped");
  }
  el.play.addEventListener("click", function () {
    if (!supported) return;
    stop(); reset();
    chunks = buildChunks(); idx = 0; playing = true;
    el.play.disabled = true; el.pause.disabled = false; el.stop.disabled = false;
    el.input.focus();
    status("Get ready…");
    timer = setTimeout(speakNext, 1200);
  });
  el.pause.addEventListener("click", function () {
    if (!playing) return;
    paused = !paused;
    if (paused) { clearTimeout(timer); synth.cancel(); status("Paused"); el.pause.textContent = "▶ Resume"; }
    else { el.pause.textContent = "❚❚ Pause"; speakNext(); }
    el.input.focus();
  });
  el.stop.addEventListener("click", stop);
  el.passage.addEventListener("change", function () { stop(); reset(); });
  el.reveal.addEventListener("click", function () {
    el.passageText.textContent = H.normalize(passage().text);
    el.passageText.setAttribute("lang", lang());
    el.passageBox.classList.toggle("hide");
  });

  /* ---------- checking ---------- */
  el.check.addEventListener("click", function () {
    stop();
    var orig = H.normalize(passage().text).split(" ");
    var text = H.normalize(el.input.value);
    var typed = text ? text.split(" ") : [];
    var ev = TE.evaluate(orig, typed);
    var errors = ev.full + ev.half / 2;
    var errPct = ev.attempted ? errors / ev.attempted * 100 : 0;
    var diff = ev.ops.map(function (op) {
      if (op.t === "ok") return '<span class="d-ok">' + esc(op.o) + "</span>";
      if (op.t === "omit") return '<span class="d-omit">' + esc(op.o) + "</span>";
      if (op.t === "add") return '<span class="d-add"><del>' + esc(op.w) + "</del></span>";
      return '<span class="d-sub' + (op.half ? " d-half" : "") + '"><del>' + esc(op.w) + "</del> <ins>" + esc(op.o) + "</ins></span>";
    }).join(" ");
    var rs = function (l, v, u) { return '<div class="tt-rs"><span>' + l + "</span><b>" + v + (u ? "<small>" + u + "</small>" : "") + "</b></div>"; };
    el.result.innerHTML =
      '<div class="tt-result-head"><div><span class="eyebrow">Transcription result</span><h2>' + errPct.toFixed(1) + ' <small>% errors</small></h2>' +
      '<p class="muted mb-0">' + ev.attempted + " of " + orig.length + " words covered · dictation at " + el.speed.value + " words/min</p></div></div>" +
      '<div class="tt-result-grid">' + rs("Correct words", ev.ok, "") + rs("Full mistakes", ev.full, "") + rs("Half mistakes", ev.half, "") +
        rs("Omitted words", ev.omit, "") + rs("Extra words", ev.add, "") + rs("Words typed", typed.length, "") + "</div>" +
      '<details class="tt-diff-box" open><summary>Word-by-word comparison</summary><div class="tt-diff" lang="' + lang() + '">' + (diff || "<em>No words typed.</em>") + "</div></details>";
    el.result.classList.remove("hide");
    el.result.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  makeAdapter();
  fillPassages();
})();
