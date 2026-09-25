/*
 * TypingTestKaro — Hindi keyboard layouts
 *  - Mangal Inscript (Unicode Inscript, Govt. of India standard)
 *  - Remington GAIL / Krutidev 010 (typewriter layout; typed as Krutidev
 *    keystrokes and converted live to Unicode)
 *
 * The Krutidev -> Unicode conversion table is adapted from
 * @bharattype/hindi-transliteration (MIT License, see LICENSE-krutidev-converter.txt).
 */
(function () {
  "use strict";

  // US-QWERTY physical key -> [normal char, shifted char]. Lets us map by
  // KeyboardEvent.code so the layout works regardless of the OS keyboard.
  var CODE_TO_US = {
    Backquote: ["`", "~"], Digit1: ["1", "!"], Digit2: ["2", "@"], Digit3: ["3", "#"], Digit4: ["4", "$"],
    Digit5: ["5", "%"], Digit6: ["6", "^"], Digit7: ["7", "&"], Digit8: ["8", "*"], Digit9: ["9", "("],
    Digit0: ["0", ")"], Minus: ["-", "_"], Equal: ["=", "+"],
    KeyQ: ["q", "Q"], KeyW: ["w", "W"], KeyE: ["e", "E"], KeyR: ["r", "R"], KeyT: ["t", "T"], KeyY: ["y", "Y"],
    KeyU: ["u", "U"], KeyI: ["i", "I"], KeyO: ["o", "O"], KeyP: ["p", "P"], BracketLeft: ["[", "{"],
    BracketRight: ["]", "}"], Backslash: ["\\", "|"],
    KeyA: ["a", "A"], KeyS: ["s", "S"], KeyD: ["d", "D"], KeyF: ["f", "F"], KeyG: ["g", "G"], KeyH: ["h", "H"],
    KeyJ: ["j", "J"], KeyK: ["k", "K"], KeyL: ["l", "L"], Semicolon: [";", ":"], Quote: ["'", "\""],
    KeyZ: ["z", "Z"], KeyX: ["x", "X"], KeyC: ["c", "C"], KeyV: ["v", "V"], KeyB: ["b", "B"], KeyN: ["n", "N"],
    KeyM: ["m", "M"], Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"], Space: [" ", " "]
  };

  // Standard Inscript (Windows "Hindi Traditional") mapping.
  var INSCRIPT = {
    "`": "ॊ", "~": "ऒ", "1": "1", "!": "ऍ", "2": "2", "@": "ॅ", "3": "3", "#": "्र", "4": "4", "$": "र्",
    "5": "5", "%": "ज्ञ", "6": "6", "^": "त्र", "7": "7", "&": "क्ष", "8": "8", "*": "श्र", "9": "9", "(": "(",
    "0": "0", ")": ")", "-": "-", "_": "ः", "=": "ृ", "+": "ऋ",
    q: "ौ", Q: "औ", w: "ै", W: "ऐ", e: "ा", E: "आ", r: "ी", R: "ई", t: "ू", T: "ऊ", y: "ब", Y: "भ",
    u: "ह", U: "ङ", i: "ग", I: "घ", o: "द", O: "ध", p: "ज", P: "झ", "[": "ड", "{": "ढ", "]": "़", "}": "ञ",
    "\\": "ॉ", "|": "ऑ",
    a: "ो", A: "ओ", s: "े", S: "ए", d: "्", D: "अ", f: "ि", F: "इ", g: "ु", G: "उ", h: "प", H: "फ",
    j: "र", J: "ऱ", k: "क", K: "ख", l: "त", L: "थ", ";": "च", ":": "छ", "'": "ट", "\"": "ठ",
    z: "ॆ", Z: "ऎ", x: "ं", X: "ँ", c: "म", C: "ण", v: "न", V: "ऩ", b: "व", B: "ऴ", n: "ल", N: "ळ",
    m: "स", M: "श", ",": ",", "<": "ष", ".": ".", ">": "।", "/": "य", "?": "य़", " ": " "
  };

  // Reverse Inscript map (single code point -> key) used by lessons to know
  // which key produces the next character.
  var INSCRIPT_REVERSE = {};
  Object.keys(INSCRIPT).forEach(function (k) {
    var v = INSCRIPT[k];
    if (v.length === 1 && !INSCRIPT_REVERSE[v]) INSCRIPT_REVERSE[v] = k;
  });
  // Digits and punctuation keep their own keys.
  INSCRIPT_REVERSE["।"] = ">";

  /* ---------------- Krutidev 010 -> Unicode ---------------- */
  var K_FROM = ["ñ", "Q+Z", "sas", "aa", ")Z", "ZZ", "‘", "’", "“", "”", "å", "ƒ", "„", "…", "†", "‡", "ˆ", "‰", "Š", "‹",
    "¶+", "d+", "[+k", "[+", "x+", "T+", "t+", "M+", "<+", "Q+", ";+", "j+", "u+", "Ùk", "Ù", "ä", "–", "—", "é", "™",
    "=kk", "f=k", "à", "á", "â", "ã", "ºz", "º", "í", "{k", "{", "=", "«", "Nî", "Vî", "Bî", "Mî", "<î", "|", "K", "}",
    "J", "Vª", "Mª", "<ªª", "Nª", "Ø", "Ý", "nzZ", "æ", "ç", "Á", "xz", "#", ":", "v‚", "vks", "vkS", "vk", "v", "b±",
    "Ã", "bZ", "b", "m", "Å", ",s", ",", "_", "ô", "d", "Dk", "D", "[k", "[", "x", "Xk", "X", "Ä", "?k", "?", "³",
    "pkS", "p", "Pk", "P", "N", "t", "Tk", "T", ">", "÷", "¥", "ê", "ë", "V", "B", "ì", "ï", "M+", "<+", "M", "<", ".k",
    ".", "r", "Rk", "R", "Fk", "F", ")", "n", "/k", "èk", "/", "Ë", "è", "u", "Uk", "U", "i", "Ik", "I", "Q", "¶", "c",
    "Ck", "C", "Hk", "H", "e", "Ek", "E", ";", "¸", "j", "y", "Yk", "Y", "G", "o", "Ok", "O", "'k", "'", "\"k", "\"",
    "l", "Lk", "L", "g", "È", "z", "Ì", "Í", "Î", "Ï", "Ñ", "Ò", "Ó", "Ô", "Ö", "Ø", "Ù", "Ük", "Ü", "‚", "ks", "kS",
    "k", "h", "q", "w", "`", "s", "S", "a", "¡", "%", "W", "•", "·", "∙", "~j", "~", "\\", "+", " ः", "^", "*", "Þ",
    "ß", "(", "¼", "½", "¿", "À", "¾", "A", "-", "&", "Œ", "]", "~ ", "@"];
  var K_TO = ["॰", "QZ+", "sa", "a", "र्द्ध", "Z", "\"", "\"", "'", "'", "०", "१", "२", "३", "४", "५", "६", "७", "८", "९",
    "फ़्", "क़", "ख़", "ख़्", "ग़", "ज़्", "ज़", "ड़", "ढ़", "फ़", "य़", "ऱ", "ऩ", "त्त", "त्त्", "क्त", "दृ", "कृ", "न्न", "न्न्",
    "=k", "f=", "ह्न", "ह्य", "हृ", "ह्म", "ह्र", "ह्", "द्द", "क्ष", "क्ष्", "त्र", "त्र्", "छ्य", "ट्य", "ठ्य", "ड्य", "ढ्य", "द्य", "ज्ञ", "द्व",
    "श्र", "ट्र", "ड्र", "ढ्र", "छ्र", "क्र", "फ्र", "र्द्र", "द्र", "प्र", "प्र", "ग्र", "रु", "रू", "ऑ", "ओ", "औ", "आ", "अ", "ईं",
    "ई", "ई", "इ", "उ", "ऊ", "ऐ", "ए", "ऋ", "क्क", "क", "क", "क्", "ख", "ख्", "ग", "ग", "ग्", "घ", "घ", "घ्", "ङ",
    "चौ", "च", "च", "च्", "छ", "ज", "ज", "ज्", "झ", "झ्", "ञ", "ट्ट", "ट्ठ", "ट", "ठ", "ड्ड", "ड्ढ", "ड़", "ढ़", "ड", "ढ", "ण",
    "ण्", "त", "त", "त्", "थ", "थ्", "द्ध", "द", "ध", "ध", "ध्", "ध्", "ध्", "न", "न", "न्", "प", "प", "प्", "फ", "फ्", "ब",
    "ब", "ब्", "भ", "भ्", "म", "म", "म्", "य", "य्", "र", "ल", "ल", "ल्", "ळ", "व", "व", "व्", "श", "श्", "ष", "ष्",
    "स", "स", "स्", "ह", "ीं", "्र", "द्द", "ट्ट", "ट्ठ", "ड्ड", "कृ", "भ", "्य", "ड्ढ", "झ्", "क्र", "त्त्", "श", "श्", "ॉ", "ो", "ौ",
    "ा", "ी", "ु", "ू", "ृ", "े", "ै", "ं", "ँ", "ः", "ॅ", "ऽ", "ऽ", "ऽ", "्र", "्", "?", "़", ":", "‘", "’", "“",
    "”", ";", "(", ")", "{", "}", "=", "।", ".", "-", "॰", ",", "् ", "/"];

  var MATRAS = "ािीुूृेैोौंःँॅ़";

  function krutiToUnicode(input) {
    if (!input) return "";
    var text = input, i, p, next;
    for (i = 0; i < K_FROM.length; i++) {
      if (text.indexOf(K_FROM[i]) !== -1) text = text.split(K_FROM[i]).join(K_TO[i]);
    }
    text = text.split("±").join("Zं").split("Æ").join("र्f");

    // Short i-matra: typed before the consonant, stored after it.
    p = text.indexOf("f");
    while (p !== -1 && p + 1 < text.length) {
      next = text.charAt(p + 1);
      text = text.slice(0, p) + next + "ि" + text.slice(p + 2);
      p = text.indexOf("f", p + 2);
    }
    text = text.split("Ç").join("fa").split("É").join("र्fa");
    p = text.indexOf("fa");
    while (p !== -1 && p + 2 < text.length) {
      next = text.charAt(p + 2);
      text = text.slice(0, p) + next + "िं" + text.slice(p + 3);
      p = text.indexOf("fa", p + 2);
    }
    text = text.split("Ê").join("ीZ");

    // i-matra placed before a half consonant -> move it after the full one.
    p = text.indexOf("ि्");
    while (p !== -1 && p + 2 < text.length) {
      next = text.charAt(p + 2);
      text = text.slice(0, p) + "्" + next + "ि" + text.slice(p + 3);
      p = text.indexOf("ि्", p + 2);
    }

    // Reph (Z) is typed after the syllable; move र् before it.
    p = text.indexOf("Z");
    while (p > 0) {
      var start = p - 1;
      while (start > 0 && MATRAS.indexOf(text.charAt(start)) !== -1) start--;
      while (start >= 2 && text.charAt(start - 1) === "्") start -= 2;
      text = text.slice(0, start) + "र्" + text.slice(start, p) + text.slice(p + 1);
      p = text.indexOf("Z");
    }
    text = text.replace(/Z/g, "");
    // A dangling "f" (i-matra typed, consonant not yet typed) shows as ि.
    text = text.replace(/f/g, "ि");
    return text.normalize("NFC");
  }

  // Keys of the Remington GAIL layout -> label shown on the virtual keyboard.
  function remingtonLabel(ch) {
    if (ch === " ") return "";
    if (/[0-9]/.test(ch)) return ch;
    var out = krutiToUnicode(ch);
    return out === ch && /[A-Za-z]/.test(ch) ? "" : out;
  }

  function normalize(s) {
    return (s || "").normalize("NFC").replace(/\s+/g, " ").trim();
  }

  window.TEHindi = {
    CODE_TO_US: CODE_TO_US,
    INSCRIPT: INSCRIPT,
    INSCRIPT_REVERSE: INSCRIPT_REVERSE,
    krutiToUnicode: krutiToUnicode,
    remingtonLabel: remingtonLabel,
    normalize: normalize,
    /** Resolve a keydown to the US-layout character of the physical key. */
    usChar: function (e) {
      var pair = CODE_TO_US[e.code];
      if (pair) return pair[e.shiftKey ? 1 : 0];
      return e.key && e.key.length === 1 ? e.key : null;
    }
  };
})();
