/*
 * TypingTestKaro — Unicode (Mangal) -> Krutidev 010 converter.
 *
 * Adds window.TEHindi.unicodeToKruti(text), the reverse of
 * TEHindi.krutiToUnicode() defined in hindi.js (load this file after it).
 *
 * Approach: NFC-normalise, split the text into orthographic syllables
 * (consonant cluster + matras + modifiers), then render each syllable in
 * Krutidev typing order:
 *   - short i-matra "f" goes BEFORE the whole consonant cluster,
 *   - reph (र् + cluster) becomes "Z" AFTER the syllable's matras,
 *   - a final "्र" becomes "z",
 *   - conjuncts with dedicated Krutidev keys (क्ष, त्र, ज्ञ, श्र, द्ध, द्य,
 *     द्व) use those keys; other half letters use the "cut" form of letters
 *     with a vertical bar, or letter + "~" (halant) otherwise.
 * Output is kept to keyboard-typeable characters wherever Krutidev allows it.
 * Non-Devanagari text (English letters, digits, spaces, newlines) passes
 * through unchanged.
 */
(function () {
  "use strict";

  var HALANT = "्", NUKTA = "़", I_MATRA = "ि", RA = "र";

  // Consonant -> [full form, half form] in Krutidev 010.
  var CONS = {
    "क": ["d", "D"], "ख": ["[k", "["], "ग": ["x", "X"], "घ": ["?k", "?"], "ङ": ["³", "³~"],
    "च": ["p", "P"], "छ": ["N", "N~"], "ज": ["t", "T"], "झ": [">", ">~"], "ञ": ["¥", "¥~"],
    "ट": ["V", "V~"], "ठ": ["B", "B~"], "ड": ["M", "M~"], "ढ": ["<", "<~"], "ण": [".k", "."],
    "त": ["r", "R"], "थ": ["Fk", "F"], "द": ["n", "n~"], "ध": ["/k", "/"], "न": ["u", "U"],
    "प": ["i", "I"], "फ": ["Q", "Q~"], "ब": ["c", "C"], "भ": ["Hk", "H"], "म": ["e", "E"],
    "य": [";", ";~"], "र": ["j", "j~"], "ल": ["y", "Y"], "ळ": ["G", "G~"], "व": ["o", "O"],
    "श": ["'k", "'"], "ष": ["\"k", "\""], "स": ["l", "L"], "ह": ["g", "g~"],
    // Precomposed nukta letters that survive NFC.
    "ऩ": ["u+", "U+"], "ऱ": ["j+", "j+~"], "ऴ": ["G+", "G+~"]
  };

  // Two-consonant conjuncts with their own Krutidev keys: [full, half].
  var CONJ = {
    "क्ष": ["{k", "{"], "त्र": ["=", "=~"], "ज्ञ": ["K", "K~"], "श्र": ["J", "J~"],
    "द्ध": [")", ")~"], "द्य": ["|", "|~"], "द्व": ["}", "}~"]
  };

  var MATRA = {
    "ा": "k", "ी": "h", "ु": "q", "ू": "w", "ृ": "`", "े": "s", "ै": "S",
    "ो": "ks", "ौ": "kS", "ॉ": "‚", "ॅ": "W"
  };

  var MODIFIER = { "ं": "a", "ँ": "¡", "ः": "%" };

  var VOWEL = {
    "अ": "v", "आ": "vk", "इ": "b", "ई": "bZ", "उ": "m", "ऊ": "Å", "ऋ": "_",
    "ए": ",", "ऐ": ",s", "ओ": "vks", "औ": "vkS", "ऑ": "v‚"
  };

  // Punctuation / digits whose Krutidev key differs from the Unicode char.
  var OTHER = {
    "।": "A", "॥": "AA", ",": "]", ".": "-", "-": "&", "?": "\\", ";": "(", ":": " %",
    "(": "¼", ")": "½", "{": "¿", "}": "À", "=": "¾", "/": "@",
    "‘": "^", "’": "*", "“": "Þ", "”": "ß",
    "॰": "Œ", "ऽ": "•",
    "०": "å", "१": "ƒ", "२": "„", "३": "…", "४": "†",
    "५": "‡", "६": "ˆ", "७": "‰", "८": "Š", "९": "‹"
  };

  function isConsonant(c) {
    var n = c.charCodeAt(0);
    return (n >= 0x0915 && n <= 0x0939) || (n >= 0x0958 && n <= 0x095F);
  }

  // Render one consonant (optionally with nukta) as full or half form.
  function consForm(unit, half) {
    var base = unit.charAt(0), nukta = unit.length > 1;
    var f = CONS[base];
    if (!f) return unit;
    if (!nukta) return half ? f[1] : f[0];
    // Nukta: "+" right after the base letter's key (NFC puts ़ before ्).
    return half ? f[0] + "+~" : f[0] + "+";
  }

  /**
   * Render a consonant cluster (array of units, each a consonant optionally
   * followed by nukta). All units except the last are half letters; if
   * `trailingHalant` the last one is half as well.
   */
  function renderCluster(units, trailingHalant) {
    var out = "", i = 0, n = units.length, isLast, pair, half;
    while (i < n) {
      // Special two-letter conjunct?
      if (i + 1 < n && units[i].length === 1 && units[i + 1].length === 1) {
        pair = CONJ[units[i] + HALANT + units[i + 1]];
        if (pair) {
          isLast = i + 2 === n;
          half = !isLast || trailingHalant;
          // conjunct + final ्र (e.g. द्ध्र) -> full + z
          if (!isLast && i + 3 === n && units[i + 2] === RA && !trailingHalant) {
            out += pair[0] + "z";
            i += 3;
            continue;
          }
          out += half ? pair[1] : pair[0];
          i += 2;
          continue;
        }
      }
      // Consonant followed by a final ्र -> full letter + "z".
      if (i + 2 === n && units[i + 1] === RA && !trailingHalant) {
        out += consForm(units[i], false) + "z";
        i += 2;
        continue;
      }
      isLast = i + 1 === n;
      out += consForm(units[i], !isLast || trailingHalant);
      i++;
    }
    return out;
  }

  function unicodeToKruti(input) {
    if (!input) return "";
    var text = String(input).normalize("NFC");
    var out = "", i = 0, len = text.length, c, dq = false, sq = false;

    while (i < len) {
      c = text.charAt(i);

      if (isConsonant(c)) {
        // --- consonant cluster ---
        var units = [], trailingHalant = false, unit;
        while (true) {
          unit = text.charAt(i);
          i++;
          if (text.charAt(i) === NUKTA) { unit += NUKTA; i++; }
          units.push(unit);
          if (text.charAt(i) === HALANT) {
            if (i + 1 < len && isConsonant(text.charAt(i + 1))) { i++; continue; }
            trailingHalant = true;
            i++;
          }
          break;
        }

        // Reph: र् at the start of a cluster of 2+ consonants.
        var reph = false;
        if (units.length > 1 && units[0] === RA) { reph = true; units.shift(); }

        // Matras and modifiers.
        var hasI = false, matras = "", mods = "", m;
        while (i < len) {
          m = text.charAt(i);
          if (m === I_MATRA) { hasI = true; i++; }
          else if (MATRA[m] !== undefined) { matras += m; i++; }
          else if (MODIFIER[m] !== undefined) { mods += MODIFIER[m]; i++; }
          else break;
        }

        var body;
        if (units.length === 1 && units[0] === RA && !trailingHalant && (matras === "ु" || matras === "ू")) {
          // रु / रू have their own keys.
          body = matras === "ु" ? "#" : ":";
          matras = "";
        } else {
          body = renderCluster(units, trailingHalant);
        }

        // The decoder's reph logic only skips back over the matras it knows,
        // which excludes ॉ, so "Z" must come before that one.
        var mk = "", late = "";
        for (var k = 0; k < matras.length; k++) {
          if (matras.charAt(k) === "ॉ") late += MATRA["ॉ"];
          else mk += MATRA[matras.charAt(k)];
        }

        var syl;
        if (hasI) {
          if (body.charAt(body.length - 1) === "+") {
            // i-matra on a nukta letter: put "f" between the letter and "+"
            // so the decoder lands ि after the nukta.
            syl = body.slice(0, -1) + "f+";
          } else {
            syl = "f" + body;
          }
        } else {
          syl = body;
        }
        out += syl + mk + (reph ? "Z" : "") + late + mods;
        continue;
      }

      if (VOWEL[c] !== undefined) {
        out += VOWEL[c];
        i++;
        while (i < len && MODIFIER[text.charAt(i)] !== undefined) {
          out += MODIFIER[text.charAt(i)];
          i++;
        }
        continue;
      }

      if (MATRA[c] !== undefined) { out += MATRA[c]; i++; continue; }
      if (MODIFIER[c] !== undefined) { out += MODIFIER[c]; i++; continue; }
      if (c === I_MATRA) { out += "f"; i++; continue; }
      if (c === HALANT) { out += "~"; i++; continue; }
      if (c === NUKTA) { out += "+"; i++; continue; }
      if (OTHER[c] !== undefined) { out += OTHER[c]; i++; continue; }
      // Straight quotes: Krutidev has no key that decodes back to them
      // (hindi.js turns them into ष्/श्), so emit open/close curly quotes.
      if (c === "\"") { out += dq ? "\u00DF" : "\u00DE"; dq = !dq; i++; continue; }
      if (c === "'") { out += sq ? "*" : "^"; sq = !sq; i++; continue; }

      // Everything else (Latin letters, digits, whitespace…) passes through.
      out += c;
      i++;
    }
    return out;
  }

  window.TEHindi = window.TEHindi || {};
  window.TEHindi.unicodeToKruti = unicodeToKruti;
})();
