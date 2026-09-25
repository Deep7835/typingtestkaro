/*
 * TypingTestKaro — weak-key practice.
 * Reads the characters you miss most (saved by the typing test) and builds a
 * personal drill for the lesson player. Must load before lesson.js.
 */
(function () {
  "use strict";
  var TE = window.TE, H = window.TEHindi;
  var box = document.getElementById("weak-info");
  if (!TE || !box) return;

  var q = new URLSearchParams(location.search);
  var layout = q.get("layout");
  if (["qwerty", "inscript", "remington"].indexOf(layout) === -1) layout = "qwerty";
  var names = { qwerty: "English", inscript: "Hindi — Mangal Inscript", remington: "Hindi — Remington GAIL / Krutidev" };
  var weak = TE.store("te_weak_" + layout) || {};
  var chars = Object.keys(weak).sort(function (a, b) { return weak[b] - weak[a]; })
    .filter(function (ch) { return TE.keyForChar(layout, ch); }).slice(0, 6);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  var tabs = Object.keys(names).map(function (l) {
    return '<a class="chip' + (l === layout ? " active" : "") + '" href="?layout=' + l + '">' + names[l] + "</a>";
  }).join("");

  // key sequence for a word, or null if any character can't be typed with one known key
  function keysFor(word) {
    if (layout === "qwerty") return word;
    if (layout === "inscript") {
      var k = "";
      for (var i = 0, a = Array.from(word); i < a.length; i++) {
        var key = H.INSCRIPT_REVERSE[a[i]];
        if (key == null) return null;
        k += key;
      }
      return k;
    }
    if (H.unicodeToKruti) {
      var kd = H.unicodeToKruti(word);
      return H.krutiToUnicode(kd) === word.normalize("NFC") ? kd : null;
    }
    return null;
  }

  if (!chars.length) {
    box.innerHTML = '<div class="chips mb-3">' + tabs + "</div>" +
      '<div class="card center"><h2>No weak keys recorded yet</h2><p class="muted">Take a typing test in <b>' + names[layout] + "</b>. The characters you mistype are saved here, and we build a personal drill from them.</p>" +
      '<a class="btn btn-primary mt-2" href="/typing-test/' + (layout === "qwerty" ? "english" : layout === "inscript" ? "hindi-mangal-inscript" : "hindi-remington-gail") + '/">Take a typing test</a></div>';
    return;
  }

  var lang = layout === "qwerty" ? "en" : "hi";
  var pool = (TE.COMMON[lang] || []).concat(lang === "en" ? [] : []);
  var items = [];
  chars.forEach(function (ch) {
    var key = TE.keyForChar(layout, ch);
    // 1) the key on its own, a few times
    var drill = layout === "qwerty" ? [ch + ch + ch, ch, ch] : [ch, ch, ch];
    drill.forEach(function (d) {
      var k = keysFor(d) || (layout === "inscript" ? key : null);
      if (k) items.push({ d: d, k: k });
    });
    // 2) real words containing it
    var words = pool.filter(function (w) { return w.indexOf(ch) !== -1 && keysFor(w); });
    for (var i = 0; i < Math.min(6, words.length); i++) {
      var w = words[Math.floor(Math.random() * words.length)];
      items.push({ d: w, k: keysFor(w) });
    }
  });
  // shuffle the word part a little so it is not predictable
  for (var i = items.length - 1; i > 0; i--) {
    if (Math.random() < 0.5) continue;
    var j = Math.floor(Math.random() * (i + 1)), t = items[i]; items[i] = items[j]; items[j] = t;
  }

  box.innerHTML = '<div class="chips mb-3">' + tabs + "</div>" +
    '<div class="row mb-2"><span class="muted">Your most-missed characters:</span><div class="chips" lang="' + lang + '">' +
    chars.map(function (c) { return '<span class="chip"><b>' + esc(c) + "</b>" + (layout !== "qwerty" ? " <kbd>" + esc(TE.keyForChar(layout, c)) + "</kbd>" : "") + " ×" + weak[c] + "</span>"; }).join("") +
    '</div><button class="btn btn-outline btn-sm" type="button" id="weak-reset">Reset</button></div>';
  document.getElementById("weak-reset").addEventListener("click", function () {
    (window.TEConfirm ? window.TEConfirm("Your recorded weak keys for this layout will be forgotten. Future tests will record them again.", "Reset", "Reset weak keys?") : Promise.resolve(true))
      .then(function (ok) {
        if (!ok) return;
        try { localStorage.removeItem("te_weak_" + layout); } catch (e) {}
        location.reload();
      });
  });

  window.TE_LESSON = {
    course: "weak-" + layout, lesson: 1, total: 1, layout: layout, lang: lang, target: 20,
    items: items.slice(0, 60), next: null, back: "/practice/weak-keys/?layout=" + layout
  };
})();
