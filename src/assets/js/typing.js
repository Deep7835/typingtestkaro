/*
 * TypingTestKaro — typing test engine
 * Renders into any element with [data-typing-test]. Options come from data-*
 * attributes and can be overridden with URL params (?lang=hi&layout=inscript&time=600).
 */
(function () {
  "use strict";

  var H = window.TEHindi;
  var P = window.TE_PASSAGES || { en: [], hi: [] };

  // kb = physical keyboard mapping used for this option (defaults to the key itself)
  var LAYOUTS = {
    qwerty: { lang: "en", label: "English (QWERTY)" },
    inscript: { lang: "hi", label: "Hindi — Mangal Inscript" },
    remington: { lang: "hi", label: "Hindi — Remington GAIL" },
    krutidev: { lang: "hi", label: "Hindi — Krutidev 010" },
    mr_inscript: { lang: "mr", kb: "inscript", label: "Marathi — Mangal Inscript" },
    mr_remington: { lang: "mr", kb: "remington", label: "Marathi — Remington / Krutidev" }
  };
  function kbOf(layout) { return (LAYOUTS[layout] && LAYOUTS[layout].kb) || layout; }
  var DURATIONS = [60, 120, 180, 300, 600, 900];
  var LANG_NAME = { en: "English", hi: "Hindi", mr: "Marathi" };

  /* ---------------- generated texts ---------------- */
  var COMMON = {
    en: ("the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part over new sound take only little work know place year live me back give most very after thing our just name good sentence man think say great where help through much before line right too mean old any same tell boy follow came want show also around form three small set put end does another well large must big even such because turn here why ask went men read need land different home us move try kind hand picture again change off play spell air away animal house point page letter mother answer found study still learn should india world").split(" "),
    hi: ("है के में की और को से का यह एक पर भी नहीं तो था हैं कि लिए साथ कर कहा गया अपने बहुत सकते होता रहे वे इस उन जो भारत सरकार देश लोग समय काम दिन वर्ष बात पानी घर जीवन राज्य शिक्षा समाज विकास नागरिक अधिकार कानून न्यायालय आदेश कार्यालय पत्र सूचना योजना प्रदेश जिला गांव शहर किसान मजदूर परिवार बच्चे विद्यालय परीक्षा परिणाम प्रश्न उत्तर नियम प्रक्रिया व्यवस्था सेवा सुरक्षा स्वास्थ्य पर्यावरण विज्ञान संविधान संसद सदस्य मंत्री अधिकारी कर्मचारी निर्णय प्रस्ताव आवेदन प्रमाण राशि बैंक खाता भुगतान तिथि स्थान नाम पता संख्या कुल").split(" ")
  };
  function genWords(lang, count, punct, nums) {
    var list = COMMON[lang] || COMMON.en, out = [];
    for (var i = 0; i < count; i++) {
      var w = list[Math.floor(Math.random() * list.length)];
      if (nums && Math.random() < 0.08) w = String(Math.floor(Math.random() * (Math.random() < 0.5 ? 100 : 10000)));
      if (punct && lang === "en") {
        var r = Math.random();
        if (r < 0.08) w = w.charAt(0).toUpperCase() + w.slice(1);
        if (r > 0.9) w += ",";
        else if (r > 0.86) w += ".";
        else if (r > 0.845) w += "?";
        else if (r > 0.835) w += ";";
      } else if (punct && Math.random() < 0.07) w += Math.random() < 0.6 ? "," : "।";
      out.push(w);
    }
    return out.join(" ");
  }
  function genNumeric(count) {
    var out = [], pad = function (n, l) { n = String(n); while (n.length < l) n = "0" + n; return n; };
    var r = function (n) { return Math.floor(Math.random() * n); };
    for (var i = 0; i < count; i++) {
      var k = r(8);
      if (k === 0) out.push(String(r(100000)));
      else if (k === 1) out.push((r(99999) / 100).toFixed(2));
      else if (k === 2) out.push(r(99) + "," + pad(r(1000), 3));
      else if (k === 3) out.push(pad(r(28) + 1, 2) + "/" + pad(r(12) + 1, 2) + "/20" + pad(r(30), 2));
      else if (k === 4) out.push(pad(r(1000000), 6));
      else if (k === 5) out.push(String(r(1000)));
      else if (k === 6) out.push("-" + r(500));
      else out.push(String(r(10)) + String(r(10)));
    }
    return out.join(" ");
  }
  function dayIndex(n) {
    var d = new Date();
    var days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return n ? days % n : 0;
  }

  /* ---------------- keypress sound ---------------- */
  var audioCtx = null;
  function click() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
      o.type = "square"; o.frequency.value = 1400 + Math.random() * 300;
      g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.04);
    } catch (e) { /* audio unavailable */ }
  }

  /* ---------------- helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function isTouch() {
    try { return window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; }
  }
  var stripPunct = function (w) { return w.replace(/[.,;:?!'"()\-।]/g, ""); };

  /* ---------------- evaluation ---------------- */
  // Semi-global word alignment: typed words vs. the passage prefix they cover.
  function evaluate(orig, typed) {
    var n = typed.length;
    var m = Math.min(orig.length, n + 80);
    var W = m + 1, dp = new Uint32Array((n + 1) * W), i, j;
    for (j = 0; j <= m; j++) dp[j] = j;
    for (i = 1; i <= n; i++) {
      dp[i * W] = i;
      for (j = 1; j <= m; j++) {
        var cost = typed[i - 1] === orig[j - 1] ? 0 : 1;
        var best = dp[(i - 1) * W + j - 1] + cost;
        var del = dp[i * W + j - 1] + 1, ins = dp[(i - 1) * W + j] + 1;
        if (del < best) best = del;
        if (ins < best) best = ins;
        dp[i * W + j] = best;
      }
    }
    // Choose where in the passage the candidate stopped.
    var end = 0, bestVal = Infinity;
    for (j = 0; j <= m; j++) {
      var v = dp[n * W + j];
      if (v < bestVal || (v === bestVal && Math.abs(j - n) < Math.abs(end - n))) { bestVal = v; end = j; }
    }
    var ops = [];
    i = n; j = end;
    while (i > 0 || j > 0) {
      var cur = dp[i * W + j];
      if (i > 0 && j > 0) {
        var c = typed[i - 1] === orig[j - 1] ? 0 : 1;
        if (cur === dp[(i - 1) * W + j - 1] + c) {
          ops.push({ t: c ? "sub" : "ok", o: orig[j - 1], w: typed[i - 1] }); i--; j--; continue;
        }
      }
      if (j > 0 && cur === dp[i * W + j - 1] + 1) { ops.push({ t: "omit", o: orig[j - 1] }); j--; continue; }
      ops.push({ t: "add", w: typed[i - 1] }); i--;
    }
    ops.reverse();

    var r = { ok: 0, full: 0, half: 0, subs: 0, omit: 0, add: 0, attempted: end, ops: ops };
    ops.forEach(function (op) {
      if (op.t === "ok") r.ok++;
      else if (op.t === "sub") {
        r.subs++;
        var sameCase = op.o.toLowerCase() === op.w.toLowerCase();
        var samePunct = stripPunct(op.o).toLowerCase() === stripPunct(op.w).toLowerCase();
        if (sameCase || samePunct) { op.half = true; r.half++; } else r.full++;
      } else if (op.t === "omit") { r.omit++; r.full++; }
      else { r.add++; r.full++; }
    });
    return r;
  }

  // Which original characters were mistyped (character-level view of substitutions).
  function missedChars(ops) {
    var miss = {};
    ops.forEach(function (op) {
      if (op.t !== "sub") return;
      // LCS between the original and typed word; original chars outside it were missed
      var o = Array.from(op.o), w = Array.from(op.w), n = o.length, m = w.length, i, j;
      var L = [];
      for (i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
      for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = o[i] === w[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      i = 0; j = 0;
      while (i < n) {
        if (j < m && o[i] === w[j]) { i++; j++; }
        else if (j < m && L[i][j + 1] >= L[i + 1][j]) j++;
        else { miss[o[i]] = (miss[o[i]] || 0) + 1; i++; }
      }
    });
    return miss;
  }

  /* ---------------- virtual keyboard ---------------- */
  var KB_ROWS = [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
    ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
    ["ShiftL", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "ShiftR"],
    ["Space"]
  ];
  var SHIFTED = { "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&", "8": "*", "9": "(", "0": ")",
    "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|", ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?" };
  var UNSHIFT = {};
  Object.keys(SHIFTED).forEach(function (k) { UNSHIFT[SHIFTED[k]] = k; });
  var FINGERS = {
    lp: "`1qaz", lr: "2wsx", lm: "3edc", li: "45rtfgvb", ri: "67yuhjnm", rm: "8ik,", rr: "9ol.", rp: "0-=p[]\\;'/"
  };
  var FINGER_NAMES = { lp: "Left pinky", lr: "Left ring", lm: "Left middle", li: "Left index", ri: "Right index",
    rm: "Right middle", rr: "Right ring", rp: "Right pinky", th: "Thumb" };
  function fingerFor(base) {
    if (base === " ") return "th";
    for (var f in FINGERS) if (FINGERS[f].indexOf(base) !== -1) return f;
    return "lp";
  }
  function baseKey(ch) {
    if (ch === " ") return " ";
    if (UNSHIFT[ch]) return UNSHIFT[ch];
    return ch.toLowerCase();
  }
  function needsShift(ch) { return !!UNSHIFT[ch] || (ch !== ch.toLowerCase()); }

  function keyLabels(layout, k) {
    layout = kbOf(layout);
    if (layout === "inscript") {
      return { main: H.INSCRIPT[k] || k, shift: H.INSCRIPT[SHIFTED[k] || k.toUpperCase()] || "" };
    }
    if (layout === "remington" || layout === "krutidev") {
      return { main: H.remingtonLabel(k), shift: H.remingtonLabel(SHIFTED[k] || k.toUpperCase()) };
    }
    return { main: /[a-z]/.test(k) ? k.toUpperCase() : k, shift: SHIFTED[k] || "" };
  }

  // Unicode character -> US key that types it (single keystroke only).
  var REM_REVERSE = null;
  function keyForChar(layout, ch) {
    layout = kbOf(layout);
    if (layout === "qwerty") return ch.length === 1 && ch.charCodeAt(0) < 128 ? ch : null;
    if (layout === "inscript") return H.INSCRIPT_REVERSE[ch] || null;
    if (!REM_REVERSE) {
      REM_REVERSE = {};
      var keys = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:\"ZXCVBNM<>?";
      for (var i = 0; i < keys.length; i++) {
        var lab = H.remingtonLabel(keys[i]);
        if (lab && Array.from(lab).length === 1 && !REM_REVERSE[lab]) REM_REVERSE[lab] = keys[i];
      }
      // full consonants typed as half-letter + "k" — the half-letter key is the one to practise
      var halfPlusK = "[k D Hk Fk /k 'k \"k ?k Xk Pk Tk Rk Uk Ik Ck Ek Yk Lk Ok";
      halfPlusK.split(" ").forEach(function (seq) {
        var u = H.krutiToUnicode(seq);
        if (Array.from(u).length === 1 && !REM_REVERSE[u]) REM_REVERSE[u] = seq.charAt(0);
      });
    }
    return REM_REVERSE[ch] || null;
  }

  function Keyboard(root, layout) {
    this.root = root;
    this.layout = layout;
    this.render();
  }
  Keyboard.prototype.render = function () {
    var self = this, html = '<div class="vk" aria-hidden="true">';
    KB_ROWS.forEach(function (row) {
      html += '<div class="vk-row">';
      row.forEach(function (k) {
        var special = { Backspace: "⌫", Tab: "Tab", Caps: "Caps", Enter: "Enter", ShiftL: "Shift", ShiftR: "Shift", Space: "" };
        if (special[k] !== undefined) {
          html += '<div class="vk-key vk-' + k.toLowerCase() + (k === "Space" ? " f-th" : "") + '" data-k="' + k + '"><span class="vk-main">' + special[k] + "</span></div>";
          return;
        }
        var lab = keyLabels(self.layout, k);
        html += '<div class="vk-key f-' + fingerFor(k) + (/[fj]/.test(k) ? " vk-bump" : "") + '" data-k="' + esc(k) + '">' +
          (lab.shift ? '<span class="vk-shift">' + esc(lab.shift) + "</span>" : "") +
          '<span class="vk-main">' + esc(lab.main) + "</span></div>";
      });
      html += "</div>";
    });
    html += "</div>";
    this.root.innerHTML = html;
  };
  Keyboard.prototype.setLayout = function (layout) { this.layout = layout; this.render(); };
  Keyboard.prototype.clear = function () {
    [].forEach.call(this.root.querySelectorAll(".vk-next,.vk-press"), function (n) { n.classList.remove("vk-next", "vk-press"); });
  };
  /** Highlight the physical key for US character `ch` (e.g. "k", "K", " "). */
  Keyboard.prototype.highlight = function (ch) {
    this.clear();
    if (ch == null) return null;
    var b = baseKey(ch);
    var node = this.root.querySelector('[data-k="' + (b === " " ? "Space" : cssEsc(b)) + '"]');
    if (node) node.classList.add("vk-next");
    if (needsShift(ch) && b !== " ") {
      var f = fingerFor(b), side = f.charAt(0) === "l" ? "ShiftR" : "ShiftL";
      var s = this.root.querySelector('[data-k="' + side + '"]');
      if (s) s.classList.add("vk-next");
    }
    return fingerFor(b);
  };
  /** Colour keys by weight: map of US key char -> 0..1 */
  Keyboard.prototype.heat = function (weights) {
    [].forEach.call(this.root.querySelectorAll(".vk-key"), function (n) {
      var w = weights[n.getAttribute("data-k")];
      if (w) {
        n.classList.add("vk-heat");
        n.style.setProperty("--heat", Math.round(18 + w * 72) + "%");
      }
    });
  };
  Keyboard.prototype.flash = function (ch) {
    var b = baseKey(ch);
    var node = this.root.querySelector('[data-k="' + (b === " " ? "Space" : cssEsc(b)) + '"]');
    if (!node) return;
    node.classList.add("vk-press");
    setTimeout(function () { node.classList.remove("vk-press"); }, 140);
  };
  function cssEsc(s) { return s.replace(/["\\]/g, "\\$&"); }

  /* ---------------- Hindi / English input adapter ---------------- */
  // Turns keydown events into text for built-in layouts; returns true if handled.
  function InputAdapter(textarea, opts) {
    this.ta = textarea;
    this.layout = opts.layout;
    this.useIME = !!opts.useIME;
    this.backspace = opts.backspace;
    this.raw = "";           // Krutidev keystroke buffer (Remington)
    this.keystrokes = 0;     // productive keystrokes
    this.onChange = opts.onChange;
    this.onKey = opts.onKey || function () {};
    this.locked = false;
    var self = this;

    textarea.addEventListener("keydown", function (e) { self.keydown(e); });
    textarea.addEventListener("beforeinput", function (e) {
      if (self.locked) { e.preventDefault(); return; }
      var t = e.inputType || "";
      if (t === "insertFromPaste" || t === "insertFromDrop") { e.preventDefault(); return; }
      if (!self.backspace && t.indexOf("delete") === 0) { e.preventDefault(); return; }
      if (self.builtIn()) e.preventDefault(); // we write the value ourselves
    });
    textarea.addEventListener("input", function () {
      if (!self.builtIn()) { self.onChange(self.value()); }
    });
    ["paste", "drop", "cut"].forEach(function (ev) {
      textarea.addEventListener(ev, function (e) { e.preventDefault(); });
    });
  }
  InputAdapter.prototype.builtIn = function () {
    return this.layout !== "qwerty" && !this.useIME;
  };
  InputAdapter.prototype.value = function () { return this.ta.value; };
  InputAdapter.prototype.reset = function () { this.raw = ""; this.keystrokes = 0; this.ta.value = ""; };
  InputAdapter.prototype.keydown = function (e) {
    if (this.locked) { e.preventDefault(); return; }
    if (e.key === "Enter") { e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // Block select-all/undo tricks that would bypass the rules.
      if (/^[azxvy]$/i.test(e.key)) e.preventDefault();
      return;
    }
    var isDel = e.key === "Backspace" || e.key === "Delete";
    if (isDel && !this.backspace) { e.preventDefault(); return; }

    var ch = null;
    if (!isDel) ch = H.usChar(e);
    if (ch && e.key !== "Unidentified" && e.key !== "Process") {
      this.keystrokes++;
      this.onKey(ch);
    }
    if (!this.builtIn()) return; // native typing (English / system IME)

    if (/^Arrow|^Home$|^End$|^PageUp$|^PageDown$/.test(e.key)) { e.preventDefault(); return; }
    if (isDel) {
      e.preventDefault();
      if (e.key === "Delete") return;
      if (this.layout === "inscript") {
        var arr = Array.from(this.ta.value); arr.pop(); this.ta.value = arr.join("");
      } else {
        this.raw = this.raw.slice(0, -1);
        this.ta.value = H.krutiToUnicode(this.raw);
      }
      this.after();
      return;
    }
    if (!ch) return;
    e.preventDefault();
    if (this.layout === "inscript") {
      this.ta.value += H.INSCRIPT[ch] != null ? H.INSCRIPT[ch] : ch;
    } else {
      this.raw += ch;
      this.ta.value = H.krutiToUnicode(this.raw);
    }
    this.after();
  };
  InputAdapter.prototype.after = function () {
    var ta = this.ta;
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    ta.scrollTop = ta.scrollHeight;
    this.onChange(ta.value);
  };
  InputAdapter.prototype.countKeys = function () {
    // Key depressions of the final text (what exams count).
    if (this.builtIn() && this.layout !== "inscript") return this.raw.replace(/\s+/g, " ").trim().length;
    return Array.from(this.ta.value.replace(/\s+/g, " ").trim()).length;
  };

  /* ---------------- Typing test ---------------- */
  function TypingTest(root) {
    this.root = root;
    var d = root.dataset, q = new URLSearchParams(location.search);
    this.exam = window.TE_EXAM || null; // injected on exam pages
    this.mode = d.mode || "practice";
    var layout = q.get("layout") || d.layout || "qwerty";
    if (layout === "krutidev") layout = "krutidev";
    if (!LAYOUTS[layout]) layout = "qwerty";
    if (q.get("lang") === "en") layout = "qwerty";
    if (q.get("lang") === "hi" && layout === "qwerty") layout = "remington";
    if (q.get("lang") === "mr" && LAYOUTS[layout].lang !== "mr") layout = "mr_remington";
    this.opts = {
      layout: layout,
      duration: parseInt(q.get("time") || d.duration || "60", 10),
      passage: q.get("passage") || q.get("source") || d.source || d.passage || "random",
      sound: store("te_sound") === true,
      fontFamily: store("te_fontfam") || "sans",
      backspace: (q.get("backspace") || d.backspace || "on") !== "off",
      highlight: (q.get("highlight") || d.highlight || (this.mode === "exam" ? "off" : "on")) !== "off",
      useIME: false,
      lockLayout: d.lockLayout === "true",
      showKeyboard: false,
      fontSize: store("te_font") || 20
    };
    if (this.exam) {
      this.opts.duration = this.exam.duration * 60;
      this.opts.backspace = this.exam.backspace !== false;
      if (!q.get("layout") && !q.get("lang")) this.opts.layout = this.exam.defaultLayout || "qwerty";
    }
    if (DURATIONS.indexOf(this.opts.duration) === -1 && !this.exam) this.opts.duration = 60;
    if (LAYOUTS[this.opts.layout].lang !== "en" && isTouch()) this.opts.useIME = true;
    this.build();
    this.newPassage();
  }

  TypingTest.prototype.lang = function () { return LAYOUTS[this.opts.layout].lang; };

  TypingTest.prototype.build = function () {
    var self = this, o = this.opts, root = this.root;
    root.classList.add("tt", this.mode === "exam" ? "tt-exam" : "tt-practice");
    var layoutOpts = Object.keys(LAYOUTS).filter(function (k) {
      if (!self.exam) return true;
      return self.exam.languages.indexOf(LAYOUTS[k].lang) !== -1 && (!self.exam.layouts || self.exam.layouts.indexOf(k) !== -1 || k === "qwerty");
    }).map(function (k) {
      return '<option value="' + k + '"' + (k === o.layout ? " selected" : "") + ">" + LAYOUTS[k].label + "</option>";
    }).join("");
    var durOpts = (this.exam ? [o.duration] : DURATIONS).map(function (s) {
      return '<option value="' + s + '"' + (s === o.duration ? " selected" : "") + ">" + (s / 60) + " min</option>";
    }).join("");

    var head = this.mode === "exam"
      ? '<div class="tt-exam-bar"><div><b>' + esc(this.exam ? this.exam.name : "Typing Test") + '</b><span>Skill Test — Typing</span></div>' +
        '<div class="tt-exam-cand">Candidate: <b>Guest</b></div>' +
        '<div class="tt-exam-timer">Time Left <b data-r="time">' + fmtTime(o.duration) + "</b></div></div>"
      : "";

    root.innerHTML =
      head +
      '<div class="tt-toolbar">' +
        '<label class="tt-field"><span>Language / Layout</span><select data-c="layout" class="input">' + layoutOpts + "</select></label>" +
        '<label class="tt-field"><span>Duration</span><select data-c="duration" class="input"' + (this.exam ? " disabled" : "") + ">" + durOpts + "</select></label>" +
        '<label class="tt-field"><span>Passage</span><select data-c="passage" class="input"></select></label>' +
        '<div class="tt-toggles">' +
          '<label class="tt-switch"><input type="checkbox" data-c="backspace"' + (o.backspace ? " checked" : "") + (this.exam ? " disabled" : "") + "><span>Backspace</span></label>" +
          '<label class="tt-switch"><input type="checkbox" data-c="highlight"' + (o.highlight ? " checked" : "") + "><span>Highlight</span></label>" +
          '<label class="tt-switch tt-hi-only"><input type="checkbox" data-c="keyboard"><span>Keyboard</span></label>' +
          '<label class="tt-switch tt-hi-only" title="Use the Hindi keyboard installed on your computer/phone instead of the built-in layout"><input type="checkbox" data-c="ime"' + (o.useIME ? " checked" : "") + "><span>My Hindi IME</span></label>" +
          '<details class="tt-more"><summary class="tt-switch">⚙ More</summary><div class="tt-more-panel">' +
            '<label class="tt-switch"><input type="checkbox" data-c="sound"' + (o.sound ? " checked" : "") + "><span>Key sound</span></label>" +
            '<label class="tt-field"><span>Passage font</span><select class="input" data-c="fontfam"><option value="sans">Sans (default)</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>' +
          "</div></details>" +
          '<div class="tt-font"><button type="button" class="icon-btn" data-c="font-" aria-label="Smaller text">A−</button><button type="button" class="icon-btn" data-c="font+" aria-label="Larger text">A+</button></div>' +
        "</div>" +
      "</div>" +
      '<div class="tt-custom hide" data-r="custom"><label class="tt-field"><span>Paste or type your own text</span>' +
        '<textarea class="input" data-r="customText" rows="4" placeholder="Paste any text here — a notice, an article, a previous-year passage…"></textarea></label>' +
        '<div class="row"><button type="button" class="btn btn-primary btn-sm" data-c="useCustom">Use this text</button><span class="muted" style="font-size:.85rem">Saved in this browser only.</span></div></div>' +
      '<div class="tt-stats">' +
        '<div class="tt-stat tt-stat-time"><span>Time</span><b data-r="time2">' + fmtTime(o.duration) + "</b></div>" +
        '<div class="tt-stat"><span>Speed</span><b data-r="wpm">0</b><small>WPM</small></div>' +
        '<div class="tt-stat"><span>Accuracy</span><b data-r="acc">100</b><small>%</small></div>' +
        '<div class="tt-stat"><span>Errors</span><b data-r="err">0</b></div>' +
        '<div class="tt-stat tt-stat-prog"><span>Progress</span><div class="tt-prog"><i data-r="prog"></i></div></div>' +
      "</div>" +
      '<div class="tt-passage-wrap"><div class="tt-passage" data-r="passage" tabindex="-1"></div></div>' +
      '<div class="tt-input-wrap">' +
        '<textarea class="tt-input" data-r="input" rows="5" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="Start typing here — the timer starts with your first key…" aria-label="Type the passage here"></textarea>' +
        '<div class="tt-layout-hint" data-r="hint"></div>' +
      "</div>" +
      '<div class="tt-kb hide" data-r="kb"></div>' +
      '<div class="tt-actions">' +
        '<button type="button" class="btn btn-outline" data-c="restart">↻ Restart</button>' +
        '<button type="button" class="btn btn-outline" data-c="new">New passage</button>' +
        '<button type="button" class="btn btn-primary" data-c="submit">Submit test</button>' +
      "</div>" +
      '<div class="tt-result hide" data-r="result" tabindex="-1"></div>';

    if (this.mode === "exam") root.querySelector(".tt-exam-bar").insertAdjacentHTML("afterend", '<div class="tt-instructions" data-r="instr"></div>');

    this.r = {};
    [].forEach.call(root.querySelectorAll("[data-r]"), function (n) { self.r[n.dataset.r] = n; });
    this.c = {};
    [].forEach.call(root.querySelectorAll("[data-c]"), function (n) { self.c[n.dataset.c] = n; });
    this.r.passage.style.fontSize = o.fontSize + "px";

    this.kb = new Keyboard(this.r.kb, o.layout);
    this.adapter = new InputAdapter(this.r.input, {
      layout: kbOf(o.layout), useIME: o.useIME, backspace: o.backspace,
      onChange: function (v) { self.onInput(v); },
      onKey: function (ch) { if (self.opts.showKeyboard) self.kb.flash(ch); if (self.opts.sound) click(); }
    });

    this.c.layout.addEventListener("change", function () { self.setLayout(this.value); });
    this.c.duration.addEventListener("change", function () { o.duration = parseInt(this.value, 10); self.restart(); });
    this.c.passage.addEventListener("change", function () { o.passage = this.value; self.newPassage(); });
    this.c.backspace.addEventListener("change", function () { o.backspace = this.checked; self.adapter.backspace = this.checked; self.r.input.focus(); });
    this.c.highlight.addEventListener("change", function () { o.highlight = this.checked; root.classList.toggle("tt-nohl", !o.highlight); self.r.input.focus(); });
    this.c.keyboard.addEventListener("change", function () { o.showKeyboard = this.checked; self.r.kb.classList.toggle("hide", !this.checked); });
    this.c.ime.addEventListener("change", function () { o.useIME = this.checked; self.adapter.useIME = this.checked; self.restart(); });
    this.c.sound.addEventListener("change", function () { o.sound = this.checked; store("te_sound", o.sound); });
    this.c.fontfam.value = o.fontFamily;
    this.c.fontfam.addEventListener("change", function () { o.fontFamily = this.value; store("te_fontfam", o.fontFamily); self.root.setAttribute("data-font", o.fontFamily); });
    this.root.setAttribute("data-font", o.fontFamily);
    this.c.useCustom.addEventListener("click", function () {
      var t = H.normalize(self.r.customText.value);
      if (!t) { self.r.customText.focus(); return; }
      store("te_custom_" + self.lang(), t);
      self.newPassage();
      self.r.input.focus();
    });
    this.c["font+"].addEventListener("click", function () { self.font(2); });
    this.c["font-"].addEventListener("click", function () { self.font(-2); });
    this.c.restart.addEventListener("click", function () { self.restart(); });
    this.c["new"].addEventListener("click", function () { self.newPassage(true); });
    this.c.submit.addEventListener("click", function () { if (self.started) self.finish(); else self.r.input.focus(); });
    root.classList.toggle("tt-nohl", !o.highlight);
    this.applyLang();
  };

  TypingTest.prototype.font = function (d) {
    this.opts.fontSize = Math.max(14, Math.min(34, this.opts.fontSize + d));
    this.r.passage.style.fontSize = this.opts.fontSize + "px";
    store("te_font", this.opts.fontSize);
  };

  TypingTest.prototype.applyLang = function () {
    var lang = this.lang(), hi = lang !== "en", o = this.opts;
    this.root.classList.toggle("tt-hi", hi);
    this.r.passage.setAttribute("lang", lang);
    this.r.input.setAttribute("lang", lang);
    this.kb.setLayout(o.layout);
    var hint = "";
    if (hi && !o.useIME) {
      hint = kbOf(o.layout) === "inscript"
        ? "Built-in <b>Mangal Inscript</b> layout active — type on your normal English keyboard. <kbd>d</kbd> = halant (्), <kbd>Shift</kbd>+<kbd>.</kbd> = ।"
        : "Built-in <b>Remington GAIL / Krutidev</b> layout active — type on your normal English keyboard. <kbd>f</kbd> = ि (type before the letter), <kbd>Z</kbd> = reph (र्), <kbd>A</kbd> = ।, <kbd>]</kbd> = comma, <kbd>-</kbd> = full stop.";
    } else if (hi) {
      hint = "Using your device's " + LANG_NAME[lang] + " keyboard (IME). Switch your system keyboard to " + LANG_NAME[lang] + " to type.";
    }
    this.r.hint.innerHTML = hint;
    this.r.hint.classList.toggle("hide", !hint);
    // passage dropdown
    var list = P[lang] || [];
    var special = [["random", "Random passage"], ["daily", "Today's daily passage"]];
    if (COMMON[lang]) special.push(["words", "Common words"], ["words+", "Common words + punctuation & numbers"]);
    if (lang === "en") special.push(["numeric", "Numeric data entry (numbers)"]);
    special.push(["custom", "Custom text — paste your own"]);
    this.c.passage.innerHTML = '<optgroup label="Practice mode">' + special.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + "</option>"; }).join("") + "</optgroup>" +
      '<optgroup label="Exam passages">' + list.map(function (p) {
        return '<option value="' + p.id + '">' + esc(p.title) + " · " + esc(p.topic) + "</option>";
      }).join("") + "</optgroup>";
    var valid = special.some(function (s) { return s[0] === o.passage; }) || list.some(function (p) { return p.id === o.passage; });
    if (!valid) o.passage = "random";
    this.c.passage.value = o.passage;
  };

  TypingTest.prototype.setLayout = function (layout) {
    var prevLang = this.lang();
    this.opts.layout = layout;
    this.adapter.layout = kbOf(layout);
    if (this.lang() !== "en" && isTouch()) { this.opts.useIME = true; this.c.ime.checked = true; this.adapter.useIME = true; }
    this.applyLang();
    if (prevLang !== this.lang()) this.newPassage(); else this.restart();
  };

  TypingTest.prototype.newPassage = function (forceRandom) {
    var lang = this.lang(), list = P[lang] || [], o = this.opts;
    if (!list.length) { this.r.passage.textContent = "Passages are loading…"; return; }
    if (forceRandom === true && o.passage !== "words" && o.passage !== "words+" && o.passage !== "numeric") { o.passage = "random"; this.c.passage.value = "random"; }
    // Enough text that nobody runs out: ~90 WPM for the whole duration.
    var need = Math.max(120, Math.ceil(o.duration / 60 * 90));
    this.r.custom.classList.toggle("hide", o.passage !== "custom");
    var generated = null, title = null;
    if (o.passage === "words" || o.passage === "words+") { generated = genWords(lang, need, o.passage === "words+", o.passage === "words+"); title = "Common words"; }
    else if (o.passage === "numeric") { generated = genNumeric(need); title = "Numeric data entry"; }
    else if (o.passage === "custom") {
      var saved = store("te_custom_" + lang);
      this.r.customText.value = saved || "";
      if (!saved) { this.words = [""]; this.passageMeta = { title: "Custom text" }; this.restart(); this.r.passage.innerHTML = '<span class="muted">Paste your text above and click <b>Use this text</b>.</span>'; return; }
      generated = saved; title = "Custom text";
    }
    if (generated) {
      this.passageMeta = { title: title, id: o.passage };
      this.words = H.normalize(generated).split(" ");
      return this.restart();
    }
    var first = o.passage === "daily" ? list[dayIndex(list.length)] : list.filter(function (p) { return p.id === o.passage; })[0];
    var pool = shuffle(list);
    if (!first) first = pool[0];
    var parts = [first.text], words = first.text.split(" ").length;
    for (var i = 0; words < need && i < pool.length * 3; i++) {
      var p = pool[i % pool.length];
      if (p === first && pool.length > 1) continue;
      parts.push(p.text); words += p.text.split(" ").length;
    }
    this.passageMeta = first;
    this.words = H.normalize(parts.join(" ")).split(" ");
    this.restart();
  };

  TypingTest.prototype.renderPassage = function () {
    var html = "";
    for (var i = 0; i < this.words.length; i++) html += '<span class="w" data-i="' + i + '">' + esc(this.words[i]) + "</span> ";
    this.r.passage.innerHTML = html;
    this.spans = this.r.passage.children;
    this.state = new Array(this.words.length);
    this.r.passage.scrollTop = 0;
  };

  TypingTest.prototype.restart = function () {
    clearInterval(this.timer);
    this.started = false; this.done = false;
    this.elapsed = 0; this.startAt = 0;
    this.adapter.reset();
    this.adapter.locked = false;
    this.r.input.disabled = false;
    this.r.result.classList.add("hide");
    this.root.classList.remove("tt-finished");
    this.renderPassage();
    this.setCur(0);
    this.updateStats();
    this.r.time2.textContent = fmtTime(this.opts.duration);
    if (this.r.time) this.r.time.textContent = fmtTime(this.opts.duration);
    if (this.mode === "exam") this.showInstructions();
    else if (document.activeElement && this.root.contains(document.activeElement)) this.r.input.focus();
  };

  TypingTest.prototype.showInstructions = function () {
    var self = this, ex = this.exam, o = this.opts;
    this.root.classList.add("tt-waiting");
    var req = ex ? ex.requirementText : "";
    this.r.instr.innerHTML =
      '<div class="tt-instr-card"><h2>Instructions</h2>' +
      '<ul class="list-check">' +
      "<li>Duration of this test is <b>" + (o.duration / 60) + " minutes</b>. The timer starts when you click <b>Start Test</b>.</li>" +
      (req ? "<li>Qualifying standard: <b>" + esc(req) + "</b></li>" : "") +
      "<li>Backspace is <b>" + (o.backspace ? "allowed" : "disabled") + "</b>. Copy, paste and Enter are disabled, as in the exam.</li>" +
      "<li>Type the passage shown above the typing box exactly — capital letters, punctuation and spacing are checked.</li>" +
      "<li>The test submits automatically when time is over. You can also submit earlier.</li>" +
      "</ul>" +
      '<div class="row mt-2"><label class="tt-field"><span>Language / Layout</span><select class="input" data-i="layout">' + this.c.layout.innerHTML + "</select></label></div>" +
      '<div class="row mt-2"><button type="button" class="btn btn-primary btn-lg" data-i="go">Start Test</button></div></div>';
    var sel = this.r.instr.querySelector('[data-i="layout"]');
    sel.value = o.layout;
    sel.addEventListener("change", function () { self.c.layout.value = this.value; self.setLayout(this.value); });
    this.r.instr.querySelector('[data-i="go"]').addEventListener("click", function () {
      self.root.classList.remove("tt-waiting");
      self.r.instr.innerHTML = "";
      self.start();
      self.r.input.focus();
    });
  };

  TypingTest.prototype.start = function () {
    if (this.started) return;
    var self = this;
    this.started = true;
    this.startAt = Date.now();
    this.samples = [];
    if (!TypingTest._guard) {
      TypingTest._guard = true;
      window.addEventListener("beforeunload", function (e) {
        var busy = [].some.call(document.querySelectorAll("[data-typing-test]"), function (n) { return n._tt && n._tt.started && !n._tt.done; });
        if (busy) { e.preventDefault(); e.returnValue = ""; }
      });
    }
    this.timer = setInterval(function () { self.tick(); }, 250);
  };

  TypingTest.prototype.tick = function () {
    this.elapsed = (Date.now() - this.startAt) / 1000;
    var left = this.opts.duration - this.elapsed;
    this.r.time2.textContent = fmtTime(left);
    if (this.r.time) this.r.time.textContent = fmtTime(left);
    this.root.classList.toggle("tt-low", left <= 30);
    var sec = Math.floor(this.elapsed);
    if (sec > 0 && sec % 5 === 0 && this.samples.length < sec / 5) this.samples.push(this.adapter.countKeys());
    this.updateStats();
    if (left <= 0) this.finish();
  };

  TypingTest.prototype.onInput = function (value) {
    if (this.done) return;
    if (!this.started) {
      if (this.mode === "exam") return;
      if (!value) return;
      this.start();
    }
    var norm = value.normalize("NFC").replace(/\s+/g, " ").replace(/^ /, "");
    var typed = norm.split(" ");
    var cur = typed.length - 1;
    var words = this.words, spans = this.spans, st = this.state;
    for (var i = 0; i < words.length && i <= Math.max(cur, this.lastCur || 0) + 1; i++) {
      var s = i < cur ? (typed[i] === words[i] ? "ok" : "bad") : "";
      if (st[i] !== s) {
        st[i] = s;
        spans[i].classList.toggle("ok", s === "ok");
        spans[i].classList.toggle("bad", s === "bad");
      }
    }
    // current word partial match
    var partial = typed[cur] || "";
    this.setCur(Math.min(cur, words.length - 1), partial && words[cur] && words[cur].indexOf(partial) !== 0);
    this.lastCur = cur;
    this.typed = typed;
    if (cur >= words.length - 1 && partial === words[words.length - 1]) this.finish();
    else if (cur >= words.length) this.finish();
  };

  TypingTest.prototype.setCur = function (i, wrong) {
    if (this.curSpan) this.curSpan.classList.remove("cur", "cur-bad");
    var s = this.spans[i];
    if (!s) return;
    s.classList.add("cur");
    if (wrong) s.classList.add("cur-bad");
    this.curSpan = s;
    // keep current word visible inside the passage box
    var box = this.r.passage;
    var top = s.offsetTop - box.offsetTop;
    if (top > box.scrollTop + box.clientHeight - s.offsetHeight * 2.2 || top < box.scrollTop) {
      box.scrollTop = Math.max(0, top - s.offsetHeight * 1.2);
    }
  };

  TypingTest.prototype.updateStats = function () {
    var min = Math.max(this.elapsed, 1) / 60;
    var keys = this.adapter.countKeys();
    var wpm = this.started ? Math.round(keys / 5 / min) : 0;
    var ok = 0, bad = 0, st = this.state || [];
    for (var i = 0; i < st.length; i++) { if (st[i] === "ok") ok++; else if (st[i] === "bad") bad++; }
    var acc = ok + bad ? Math.round(ok / (ok + bad) * 100) : 100;
    this.r.wpm.textContent = wpm;
    this.r.acc.textContent = acc;
    this.r.err.textContent = bad;
    var done = this.typed ? Math.min(1, (this.typed.length - 1) / this.words.length) : 0;
    this.r.prog.style.width = (this.opts.duration ? Math.min(100, this.elapsed / this.opts.duration * 100) : done * 100) + "%";
  };

  TypingTest.prototype.finish = function () {
    if (this.done) return;
    this.done = true;
    clearInterval(this.timer);
    this.elapsed = Math.min(this.opts.duration, (Date.now() - this.startAt) / 1000) || 1;
    this.adapter.locked = true;
    this.r.input.blur();
    this.updateStats();
    this.root.classList.add("tt-finished");
    this.showResult();
  };

  TypingTest.prototype.computeResult = function () {
    var text = this.r.input.value.normalize("NFC").replace(/\s+/g, " ").trim();
    var typed = text ? text.split(" ") : [];
    var ev = evaluate(this.words, typed);
    var min = this.elapsed / 60;
    var keys = this.adapter.countKeys();
    var gross = keys / 5 / min;
    var errors = ev.full + ev.half / 2;
    var net = Math.max(0, gross - errors / min);
    var totalCompared = ev.ok + ev.subs + ev.omit + ev.add;
    return {
      ev: ev, keys: keys, minutes: min, typedWords: typed.length,
      gross: gross, net: net, errors: errors,
      accuracy: totalCompared ? ev.ok / totalCompared * 100 : 0,
      errorPct: ev.attempted ? errors / ev.attempted * 100 : 0,
      kdph: keys * 60 / min
    };
  };

  TypingTest.prototype.showResult = function () {
    var r = this.computeResult(), ex = this.exam, lang = this.lang(), o = this.opts, self = this;
    var verdict = "";
    if (ex) {
      var pass, need;
      if (ex.kdph) { need = ex.kdph + " key depressions/hour"; pass = r.kdph >= ex.kdph; }
      else { var w = ex.speed[lang]; need = w + " WPM (" + LANG_NAME[lang] + ")"; pass = r.net >= w; }
      verdict = '<div class="tt-verdict ' + (pass ? "pass" : "fail") + '"><b>' + (pass ? "✓ Qualified" : "✗ Not qualified yet") +
        "</b><span>" + esc(ex.name) + " standard: " + esc(need) + (pass ? " — well done! Keep practising to stay consistent." : " — keep practising, you'll get there.") + "</span></div>";
    }
    var ops = r.ev.ops.map(function (op) {
      if (op.t === "ok") return '<span class="d-ok">' + esc(op.o) + "</span>";
      if (op.t === "omit") return '<span class="d-omit" title="Omitted word">' + esc(op.o) + "</span>";
      if (op.t === "add") return '<span class="d-add" title="Extra word"><del>' + esc(op.w) + "</del></span>";
      return '<span class="d-sub' + (op.half ? " d-half" : "") + '" title="' + (op.half ? "Half mistake" : "Full mistake") + '"><del>' + esc(op.w) + "</del> <ins>" + esc(op.o) + "</ins></span>";
    }).join(" ");

    // speed over time (5-second intervals)
    var pts = (this.samples || []).slice();
    if (!pts.length || pts[pts.length - 1] !== r.keys) pts.push(r.keys);
    var speeds = [], prev = 0;
    pts.forEach(function (k, i) {
      var secs = i < (self.samples || []).length ? 5 : Math.max(1, self.elapsed - i * 5);
      speeds.push(Math.max(0, (k - prev) / 5 / (secs / 60)));
      prev = k;
    });
    var mean = speeds.reduce(function (a, b) { return a + b; }, 0) / (speeds.length || 1);
    var sd = Math.sqrt(speeds.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (speeds.length || 1));
    var consistency = speeds.length > 1 && mean ? Math.max(0, Math.round(100 - sd / mean * 100)) : 100;

    // weak characters
    var miss = missedChars(r.ev.ops), missList = Object.keys(miss).sort(function (x, y) { return miss[y] - miss[x]; });
    var weights = {}, maxMiss = missList.length ? miss[missList[0]] : 1;
    missList.forEach(function (ch) {
      var k = keyForChar(o.layout, ch);
      if (k) { var b = baseKey(k); weights[b] = Math.max(weights[b] || 0, miss[ch] / maxMiss); }
    });
    var weakKey = "te_weak_" + kbOf(o.layout), weak = store(weakKey) || {};
    missList.forEach(function (ch) { weak[ch] = (weak[ch] || 0) + miss[ch]; });
    if (missList.length) store(weakKey, weak);

    this.r.result.innerHTML =
      '<div class="tt-result-head"><div><span class="eyebrow">Your result</span><h2>' + Math.round(r.net) + ' <small>Net WPM</small></h2>' +
      '<p class="muted mb-0">' + esc(LAYOUTS[o.layout].label) + " · " + fmtTime(this.elapsed) + " typed · " + esc(this.passageMeta.title) + "</p></div>" +
      '<div class="row"><button type="button" class="btn btn-primary" data-x="retry">↻ Try again</button><button type="button" class="btn btn-outline" data-x="new">New passage</button><button type="button" class="btn btn-accent" data-x="cert">🎓 Certificate</button><button type="button" class="btn btn-outline" data-copy="' + esc("I typed " + Math.round(r.net) + " WPM (net) with " + r.accuracy.toFixed(1) + "% accuracy on the " + (ex ? ex.name + " " : "") + LAYOUTS[o.layout].label + " typing test at TypingTestKaro — typingtestkaro.com") + '">📋 Copy result</button></div></div>' +
      verdict +
      '<div class="tt-cert hide" data-x="certbox"><label class="tt-field"><span>Name on certificate</span><input class="input" data-x="certname" maxlength="40" placeholder="Your full name"></label>' +
        '<button type="button" class="btn btn-primary" data-x="certgo">Download certificate (PNG)</button>' +
        '<p class="muted mb-0" style="font-size:.8rem">A self-assessed practice certificate from TypingTestKaro. It is not an official or government certificate.</p></div>' +
      '<div class="tt-result-grid">' +
        rs("Gross speed", Math.round(r.gross), "WPM") + rs("Net speed", Math.round(r.net), "WPM") +
        rs("Accuracy", r.accuracy.toFixed(1), "%") + rs("Error rate", r.errorPct.toFixed(1), "%") +
        rs("Consistency", consistency, "%") + rs("KDPH", Math.round(r.kdph).toLocaleString("en-IN"), "") +
        rs("Key depressions", r.keys, "") + rs("Correct words", r.ev.ok, "") +
        rs("Full mistakes", r.ev.full, "") + rs("Half mistakes", r.ev.half, "") +
        rs("Omitted words", r.ev.omit, "") + rs("Extra words", r.ev.add, "") +
      "</div>" +
      '<div class="tt-analysis">' +
        '<div class="tt-panel"><h3>Speed over time</h3>' + chart(speeds, r.net) + '<p class="muted tt-note">Bars show your speed in each 5-second interval; the line is your average net speed.</p></div>' +
        '<div class="tt-panel"><h3>Weak keys</h3>' +
          (missList.length
            ? '<div class="chips tt-miss" lang="' + lang + '">' + missList.slice(0, 10).map(function (ch) {
                var k = keyForChar(o.layout, ch);
                return '<span class="chip"><b>' + esc(ch) + "</b>" + (k && lang !== "en" ? ' <kbd>' + esc(k) + "</kbd>" : "") + " ×" + miss[ch] + "</span>";
              }).join("") + '</div><div class="tt-heat" data-x="heat"></div>' +
              '<a class="btn btn-outline btn-sm mt-2" href="/practice/weak-keys/?layout=' + kbOf(o.layout) + '">Practise my weak keys →</a>'
            : '<p class="muted">No character mistakes in this test — excellent accuracy!</p>') +
        "</div></div>" +
      '<details class="tt-diff-box" open><summary>Word-by-word comparison</summary>' +
      '<div class="tt-legend"><span class="d-ok">correct</span><span class="d-sub"><del>typed</del> <ins>original</ins></span><span class="d-sub d-half">half mistake</span><span class="d-omit">omitted</span><span class="d-add"><del>extra</del></span></div>' +
      '<div class="tt-diff" lang="' + lang + '">' + (ops || "<em>No words typed.</em>") + "</div></details>" +
      '<p class="tt-formula muted">Gross WPM = (key depressions ÷ 5) ÷ minutes. Net WPM = Gross WPM − (mistakes ÷ minutes), where a half mistake counts as 0.5. Rules differ between exams — see the exam page for the official method.</p>';

    var heat = this.r.result.querySelector('[data-x="heat"]');
    if (heat) new Keyboard(heat, o.layout).heat(weights);
    var q = function (x) { return self.r.result.querySelector('[data-x="' + x + '"]'); };
    q("retry").addEventListener("click", function () { self.restart(); self.r.input.focus(); scrollToEl(self.root); });
    q("new").addEventListener("click", function () { self.newPassage(true); self.r.input.focus(); scrollToEl(self.root); });
    q("cert").addEventListener("click", function () {
      q("certbox").classList.toggle("hide");
      var nm = q("certname"); nm.value = store("te_name") || ""; nm.focus();
    });
    q("certgo").addEventListener("click", function () {
      var name = q("certname").value.trim();
      if (!name) { q("certname").focus(); return; }
      store("te_name", name);
      certificate({
        name: name, net: Math.round(r.net), gross: Math.round(r.gross), acc: r.accuracy.toFixed(1),
        layout: LAYOUTS[o.layout].label, minutes: Math.max(1, Math.round(self.elapsed / 60)), exam: ex ? ex.name : null
      });
    });
    this.r.result.classList.remove("hide");
    this.r.result.focus({ preventScroll: true });
    scrollToEl(this.r.result);

    // history
    var hist = store("te_history") || [];
    hist.unshift({
      t: Date.now(), layout: o.layout, dur: Math.round(this.elapsed), net: Math.round(r.net), gross: Math.round(r.gross),
      acc: Math.round(r.accuracy), exam: ex ? ex.name : null
    });
    store("te_history", hist.slice(0, 200));
    if (window.TETrack) window.TETrack("typing_test_complete", { layout: o.layout, minutes: Math.round(this.elapsed / 60), net_wpm: Math.round(r.net), accuracy: Math.round(r.accuracy), exam: ex ? ex.name : "practice" });

    function rs(label, val, unit) {
      return '<div class="tt-rs"><span>' + label + "</span><b>" + val + (unit ? "<small>" + unit + "</small>" : "") + "</b></div>";
    }
  };

  function chart(speeds, avg) {
    if (!speeds.length) return "";
    var W = 600, Hh = 160, max = Math.max(20, avg) * 1.1;
    speeds.forEach(function (v) { if (v * 1.05 > max) max = v * 1.05; });
    var bw = W / speeds.length, y = function (v) { return Hh - v / max * Hh; };
    var bars = speeds.map(function (v, i) {
      return '<rect x="' + (i * bw + bw * 0.15).toFixed(1) + '" y="' + y(v).toFixed(1) + '" width="' + (bw * 0.7).toFixed(1) + '" height="' + (Hh - y(v)).toFixed(1) + '" rx="3" fill="var(--primary)" opacity=".75"><title>' + (i * 5) + "–" + (i * 5 + 5) + "s: " + Math.round(v) + " WPM</title></rect>";
    }).join("");
    return '<svg class="tt-chart" viewBox="0 0 ' + W + " " + (Hh + 18) + '" role="img" aria-label="Typing speed over time">' +
      '<line x1="0" x2="' + W + '" y1="' + Hh + '" y2="' + Hh + '" stroke="var(--border)"/>' + bars +
      '<line x1="0" x2="' + W + '" y1="' + y(avg).toFixed(1) + '" y2="' + y(avg).toFixed(1) + '" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 5"/>' +
      '<text x="' + (W - 4) + '" y="' + Math.max(12, y(avg) - 6).toFixed(1) + '" text-anchor="end" font-size="13" fill="var(--accent)" font-weight="700">avg ' + Math.round(avg) + " WPM</text>" +
      '<text x="0" y="' + (Hh + 15) + '" font-size="12" fill="var(--muted)">0s</text><text x="' + W + '" y="' + (Hh + 15) + '" font-size="12" fill="var(--muted)" text-anchor="end">' + speeds.length * 5 + "s</text></svg>";
  }

  /* ---------------- practice certificate (canvas PNG) ---------------- */
  function certificate(d) {
    var c = document.createElement("canvas"), W = 1600, Hh = 1130;
    c.width = W; c.height = Hh;
    var x = c.getContext("2d");
    var sans = '"Uncut Sans","Noto Sans Devanagari",Arial,sans-serif';
    x.fillStyle = "#fffdf8"; x.fillRect(0, 0, W, Hh);
    var g = x.createLinearGradient(0, 0, W, Hh); g.addColorStop(0, "#064e3b"); g.addColorStop(0.6, "#0f766e"); g.addColorStop(1, "#14b8a6");
    x.strokeStyle = g; x.lineWidth = 28; x.strokeRect(14, 14, W - 28, Hh - 28);
    x.strokeStyle = "#d97706"; x.lineWidth = 3; x.strokeRect(58, 58, W - 116, Hh - 116);
    x.textAlign = "center";
    x.fillStyle = "#0f766e"; x.font = "700 34px " + sans; x.fillText("TYPINGTESTKARO", W / 2, 150);
    x.fillStyle = "#0f1f1c"; x.font = "700 72px " + sans; x.fillText("Certificate of Typing Speed", W / 2, 260);
    x.fillStyle = "#52665f"; x.font = "400 30px " + sans; x.fillText("This is to certify that", W / 2, 350);
    x.fillStyle = "#064e3b"; x.font = "700 78px " + sans; x.fillText(d.name, W / 2, 460);
    x.fillStyle = "#d97706"; x.fillRect(W / 2 - 260, 490, 520, 4);
    x.fillStyle = "#52665f"; x.font = "400 30px " + sans;
    x.fillText("completed a " + d.minutes + "-minute " + (d.exam ? d.exam + " " : "") + "typing test (" + d.layout + ") with", W / 2, 570);
    var box = function (cx, val, label) {
      x.fillStyle = "#e0f2ef"; x.beginPath();
      if (x.roundRect) x.roundRect(cx - 170, 620, 340, 170, 24); else x.rect(cx - 170, 620, 340, 170);
      x.fill();
      x.fillStyle = "#0f766e"; x.font = "700 72px " + sans; x.fillText(val, cx, 715);
      x.fillStyle = "#52665f"; x.font = "600 26px " + sans; x.fillText(label, cx, 760);
    };
    box(W / 2 - 390, String(d.net), "NET WPM"); box(W / 2, String(d.gross), "GROSS WPM"); box(W / 2 + 390, d.acc + "%", "ACCURACY");
    var id = "TK-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.floor(Math.random() * 900 + 100);
    var date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    x.fillStyle = "#0f1f1c"; x.font = "600 28px " + sans;
    x.textAlign = "left"; x.fillText("Date: " + date, 140, 920);
    x.textAlign = "right"; x.fillText("Certificate ID: " + id, W - 140, 920);
    x.textAlign = "center"; x.fillStyle = "#7d938c"; x.font = "400 22px " + sans;
    x.fillText("Self-assessed practice certificate issued by typingtestkaro.com — not an official or government certificate.", W / 2, 1010);
    c.toBlob(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "typing-certificate-" + d.net + "wpm.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  }

  function scrollToEl(n) {
    var y = n.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  /* ---------------- boot ---------------- */
  window.TE = window.TE || {};
  window.TE.Keyboard = Keyboard;
  window.TE.fingerFor = fingerFor;
  window.TE.baseKey = baseKey;
  window.TE.FINGER_NAMES = FINGER_NAMES;
  window.TE.evaluate = evaluate;
  window.TE.store = store;
  window.TE.TypingTest = TypingTest;
  window.TE.InputAdapter = InputAdapter;
  window.TE.COMMON = COMMON;
  window.TE.genWords = genWords;
  window.TE.missedChars = missedChars;
  window.TE.keyForChar = keyForChar;
  window.TE.kbOf = kbOf;
  window.TE.LAYOUTS = LAYOUTS;
  window.TE.fmtTime = fmtTime;

  document.addEventListener("DOMContentLoaded", function () {
    [].forEach.call(document.querySelectorAll("[data-typing-test]"), function (n) { n._tt = new TypingTest(n); });
  });
})();
