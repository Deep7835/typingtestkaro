/* TypingTestKaro — tools: Hindi typing pad, Krutidev converter, speed calculator, progress. */
(function () {
  "use strict";
  var H = window.TEHindi;

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      if (val === null) return localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Copied to clipboard"); }, function () { toast("Press Ctrl+C to copy"); });
    } else toast("Press Ctrl+C to copy");
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; });
  }

  /* ---------------- Hindi typing pad ---------------- */
  var pad = document.getElementById("hindi-pad");
  if (pad && H) {
    var ta = document.getElementById("hp-text"), sel = document.getElementById("hp-layout");
    var saved = store("te_hindi_pad") || {};
    // The document is a list of "chunks": committed Unicode text plus the current
    // Krutidev keystroke run (so ि and reph can re-order while typing).
    var committed = saved.text || "", raw = "";
    sel.value = saved.layout || "remington";
    var kb = window.TE && window.TE.Keyboard ? new window.TE.Keyboard(document.getElementById("hp-kb"), sel.value) : null;

    function value() { return committed + (raw ? H.krutiToUnicode(raw) : ""); }
    function paint() {
      ta.value = value();
      ta.selectionStart = ta.selectionEnd = ta.value.length;
      var v = ta.value.trim();
      document.getElementById("hp-count").textContent = (v ? v.split(/\s+/).length : 0) + " words · " + Array.from(ta.value).length + " characters";
      store("te_hindi_pad", { text: value(), layout: sel.value });
    }
    function commit() { committed = value(); raw = ""; }
    function typeKey(ch) {
      if (sel.value === "inscript") { committed += H.INSCRIPT[ch] != null ? H.INSCRIPT[ch] : ch; }
      else {
        raw += ch;
        if (ch === " ") commit(); // a word is finished — freeze it
      }
      if (kb) kb.flash(ch);
      paint();
    }
    ta.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if (/^[ax]$/i.test(e.key)) return; // allow select-all / cut handled below
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        if (ta.selectionStart !== ta.selectionEnd && ta.selectionStart === 0 && ta.selectionEnd === ta.value.length) { committed = ""; raw = ""; }
        else if (raw) raw = raw.slice(0, -1);
        else { var arr = Array.from(committed); arr.pop(); committed = arr.join(""); }
        return paint();
      }
      if (e.key === "Enter") { e.preventDefault(); commit(); committed += "\n"; return paint(); }
      if (e.key === "Tab" || /^Arrow|^Home$|^End$/.test(e.key)) { if (e.key !== "Tab") e.preventDefault(); return; }
      var ch = H.usChar(e);
      if (!ch || e.key === "Unidentified" || e.key === "Process") return;
      e.preventDefault();
      typeKey(ch);
    });
    ta.addEventListener("cut", function () { setTimeout(function () { committed = ta.value; raw = ""; paint(); }, 0); });
    ta.addEventListener("paste", function (e) {
      e.preventDefault();
      commit();
      committed += (e.clipboardData || window.clipboardData).getData("text");
      paint();
    });
    // mobile IMEs: accept whatever the system keyboard produced
    ta.addEventListener("input", function () { committed = ta.value; raw = ""; paint(); });
    sel.addEventListener("change", function () { commit(); if (kb) kb.setLayout(sel.value); paint(); ta.focus(); });
    document.getElementById("hp-kb").addEventListener("click", function (e) {
      var k = e.target.closest(".vk-key");
      if (!k) return;
      var name = k.getAttribute("data-k");
      if (name === "Space") typeKey(" ");
      else if (name === "Backspace") ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace" }));
      else if (name.length === 1) typeKey(name);
      ta.focus();
    });
    document.getElementById("hp-copy").addEventListener("click", function () { copy(value()); });
    document.getElementById("hp-clear").addEventListener("click", function () {
      if (!value().trim()) return ta.focus();
      (window.TEConfirm ? window.TEConfirm("Everything you have typed in the box will be erased.", "Clear text", "Clear the text?") : Promise.resolve(true))
        .then(function (ok) { if (ok) { committed = ""; raw = ""; paint(); } ta.focus(); });
    });
    document.getElementById("hp-download").addEventListener("click", function () {
      var blob = new Blob([value()], { type: "text/plain;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "hindi-text.txt";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    });
    paint();
  }

  /* ---------------- Krutidev -> Unicode ---------------- */
  var kdGo = document.getElementById("kd-go");
  if (kdGo && H) {
    var kin = document.getElementById("kd-in"), kout = document.getElementById("kd-out");
    var convert = function () {
      kout.value = kin.value.split("\n").map(function (line) { return H.krutiToUnicode(line); }).join("\n");
    };
    kdGo.addEventListener("click", convert);
    kin.addEventListener("input", convert);
    document.getElementById("kd-sample").addEventListener("click", function () {
      kin.value = "Hkkjr ,d fo'kky yksdrkaf=d ns'k gSA ;gk¡ ds ukxfjdksa dks lafo/kku }kjk ekSfyd vf/kdkj iznku fd, x, gSaA";
      convert();
    });
    document.getElementById("kd-copy").addEventListener("click", function () { copy(kout.value); });
  }

  /* ---------------- Speed calculator ---------------- */
  var calc = document.getElementById("calc");
  if (calc) {
    var out = document.getElementById("calc-out");
    var num = function (id) { return parseFloat(document.getElementById(id).value) || 0; };
    var run = function () {
      var keys = num("c-keys"), min = Math.max(num("c-min"), 0.01), full = num("c-full"), half = num("c-half");
      var words = keys / 5, gross = words / min, errors = full + half / 2;
      var net = Math.max(0, gross - errors / min), errPct = words ? errors / words * 100 : 0;
      var cell = function (l, v, u) { return '<div class="tt-rs"><span>' + l + "</span><b>" + v + (u ? "<small>" + u + "</small>" : "") + "</b></div>"; };
      out.innerHTML = cell("Gross speed", gross.toFixed(1), "WPM") + cell("Net speed", net.toFixed(1), "WPM") +
        cell("KDPH", Math.round(keys * 60 / min).toLocaleString("en-IN"), "") + cell("Words", words.toFixed(0), "") +
        cell("Error rate", errPct.toFixed(2), "%") + cell("Accuracy", Math.max(0, 100 - errPct).toFixed(2), "%");
    };
    calc.addEventListener("input", run);
    run();
  }

  /* ---------------- My progress ---------------- */
  var pr = document.getElementById("progress-root");
  if (pr) {
    var LBL = { qwerty: "English", inscript: "Hindi · Inscript", remington: "Hindi · Remington", krutidev: "Hindi · Krutidev", mr_inscript: "Marathi · Inscript", mr_remington: "Marathi · Remington" };
    var draw = function () {
      var hist = store("te_history") || [];
      if (!hist.length) {
        pr.innerHTML = '<div class="card center"><h2>No results yet</h2><p class="muted">Take a typing test and your results will appear here.</p><a class="btn btn-primary mt-2" href="/typing-test/">Take a typing test</a></div>';
        return;
      }
      var best = hist.reduce(function (m, h) { return Math.max(m, h.net); }, 0);
      var last10 = hist.slice(0, 10), avg = Math.round(last10.reduce(function (s, h) { return s + h.net; }, 0) / last10.length);
      var avgAcc = Math.round(last10.reduce(function (s, h) { return s + h.acc; }, 0) / last10.length);
      // sparkline of last 30 net WPM (oldest -> newest)
      var pts = hist.slice(0, 30).reverse(), W = 600, Hh = 140, max = Math.max(10, best) * 1.15;
      var step = pts.length > 1 ? W / (pts.length - 1) : W;
      var path = pts.map(function (h, i) { return (i ? "L" : "M") + (i * step).toFixed(1) + " " + (Hh - h.net / max * Hh).toFixed(1); }).join(" ");
      pr.innerHTML =
        '<div class="grid grid-4">' +
          '<div class="card stat"><b>' + best + "</b><span>Best net WPM</span></div>" +
          '<div class="card stat"><b>' + avg + "</b><span>Average (last 10)</span></div>" +
          '<div class="card stat"><b>' + avgAcc + "%</b><span>Accuracy (last 10)</span></div>" +
          '<div class="card stat"><b>' + hist.length + "</b><span>Tests taken</span></div></div>" +
        '<div class="card mt-3"><h2 style="font-size:1.2rem">Net WPM trend (last ' + pts.length + ' tests)</h2>' +
          '<svg class="spark" viewBox="-8 -8 ' + (W + 16) + " " + (Hh + 16) + '" preserveAspectRatio="none" role="img" aria-label="Net WPM trend">' +
          '<path d="' + path + '" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
          pts.map(function (h, i) { return '<circle cx="' + (i * step).toFixed(1) + '" cy="' + (Hh - h.net / max * Hh).toFixed(1) + '" r="4" fill="var(--primary)"><title>' + h.net + " WPM</title></circle>"; }).join("") +
          "</svg></div>" +
        '<div class="table-wrap mt-3"><table><thead><tr><th>Date</th><th>Test</th><th>Layout</th><th>Time</th><th>Net WPM</th><th>Gross</th><th>Accuracy</th></tr></thead><tbody>' +
          hist.map(function (h) {
            return "<tr><td>" + new Date(h.t).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) + "</td><td>" + esc(h.exam || "Practice") + "</td><td>" + (LBL[h.layout] || h.layout) +
              "</td><td>" + Math.round(h.dur / 60 * 10) / 10 + " min</td><td><b>" + h.net + "</b></td><td>" + h.gross + "</td><td>" + h.acc + "%</td></tr>";
          }).join("") + "</tbody></table></div>" +
        '<div class="row mt-3"><a class="btn btn-primary" href="/typing-test/">Take another test</a><button class="btn btn-outline" type="button" id="pr-clear">Clear history</button></div>';
      document.getElementById("pr-clear").addEventListener("click", function () {
        (window.TEConfirm ? window.TEConfirm("All your saved typing test results will be deleted from this browser. This can't be undone.", "Delete results", "Clear your history?") : Promise.resolve(confirm("Delete all saved results?")))
          .then(function (ok) { if (ok) { store("te_history", null); draw(); if (window.TEToast) window.TEToast("History cleared"); } });
      });
    };
    draw();
  }
})();

/* ---------------- Unicode -> Krutidev & English -> Hindi ---------------- */
(function () {
  "use strict";
  var H = window.TEHindi;
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("Copied to clipboard"); }, function () { toast("Press Ctrl+C to copy"); });
    else toast("Press Ctrl+C to copy");
  }

  var u2k = document.getElementById("u2k-go");
  if (u2k && H && H.unicodeToKruti) {
    var uin = document.getElementById("u2k-in"), uout = document.getElementById("u2k-out");
    var run = function () { uout.value = uin.value.split("\n").map(function (l) { return H.unicodeToKruti(l); }).join("\n"); };
    u2k.addEventListener("click", run);
    uin.addEventListener("input", run);
    document.getElementById("u2k-sample").addEventListener("click", function () {
      uin.value = "भारत एक विशाल लोकतांत्रिक देश है। संविधान द्वारा नागरिकों को मौलिक अधिकार प्रदान किए गए हैं।";
      run();
    });
    document.getElementById("u2k-copy").addEventListener("click", function () { copy(uout.value); });
  }

  var ta = document.getElementById("tl-text");
  var T = window.TETranslit;
  if (ta && T) {
    var sugg = document.getElementById("tl-sugg"), last = null;
    try { ta.value = localStorage.getItem("te_translit") || ""; } catch (e) {}
    var save = function () { try { localStorage.setItem("te_translit", ta.value); } catch (e) {} };
    // the roman word right before the caret
    var current = function () {
      var before = ta.value.slice(0, ta.selectionStart), m = before.match(/[A-Za-z]+$/);
      return m ? { word: m[0], start: before.length - m[0].length, end: ta.selectionStart } : null;
    };
    var replace = function (cur, hindi, trailing) {
      ta.value = ta.value.slice(0, cur.start) + hindi + trailing + ta.value.slice(cur.end);
      var pos = cur.start + hindi.length + trailing.length;
      ta.selectionStart = ta.selectionEnd = pos;
      last = { roman: cur.word, hindi: hindi + trailing, at: cur.start };
      save();
    };
    var showSugg = function () {
      var cur = current();
      if (!cur) { sugg.innerHTML = ""; return; }
      var list = [T.wordToHindi(cur.word)].concat(T.suggestions ? T.suggestions(cur.word) : [])
        .filter(function (w, i, a) { return w && a.indexOf(w) === i; }).slice(0, 5);
      sugg.innerHTML = list.map(function (w) { return '<button type="button" class="chip">' + w + "</button>"; }).join("") +
        '<button type="button" class="chip" data-keep="1">' + cur.word + "</button>";
      [].forEach.call(sugg.querySelectorAll("button"), function (b) {
        b.addEventListener("mousedown", function (e) { e.preventDefault(); });
        b.addEventListener("click", function () {
          var c = current(); if (!c) return;
          replace(c, b.getAttribute("data-keep") ? c.word : b.textContent, " ");
          sugg.innerHTML = ""; ta.focus();
        });
      });
    };
    ta.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") {
        var cur = current();
        if (cur) { e.preventDefault(); replace(cur, T.wordToHindi(cur.word), e.key === "Enter" ? "\n" : " "); sugg.innerHTML = ""; }
        return;
      }
      if (e.key === "Backspace" && last && ta.selectionStart === last.at + last.hindi.length && ta.value.slice(last.at, ta.selectionStart) === last.hindi) {
        e.preventDefault();
        ta.value = ta.value.slice(0, last.at) + last.roman + ta.value.slice(ta.selectionStart);
        ta.selectionStart = ta.selectionEnd = last.at + last.roman.length;
        last = null; save(); showSugg();
        return;
      }
      if (e.key.length === 1) last = null;
    });
    ta.addEventListener("input", function () { showSugg(); save(); });
    ta.addEventListener("click", showSugg);
    document.getElementById("tl-copy").addEventListener("click", function () { copy(ta.value); });
    document.getElementById("tl-clear").addEventListener("click", function () { ta.value = ""; save(); sugg.innerHTML = ""; ta.focus(); });
  }
})();
