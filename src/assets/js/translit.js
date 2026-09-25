/*
 * TypingTestKaro — English (Hinglish) -> Hindi phonetic transliteration.
 *
 * window.TETranslit = { toHindi(text), wordToHindi(word), suggestions(word) }
 *
 * Rule-based, in the spirit of Google Input Tools:
 *   - a small dictionary of very common words gives natural spellings,
 *   - otherwise the word is parsed greedily (longest match first) into
 *     consonants and vowels; vowels become matras after a consonant and
 *     independent letters elsewhere; consecutive consonants are joined
 *     with a halant (prashn -> प्रश्न),
 *   - "n"/"m" before a suitable consonant becomes anusvara (hindi -> हिंदी),
 *   - the inherent "a" is silent word-finally (kamal -> कमल) but a typed
 *     final "a"/"i" after a consonant is long (kamla -> कमला, nadi -> नदी),
 *     with small heuristics for common Hindi patterns (karna -> करना,
 *     mitra -> मित्र, shakti -> शक्ति, kasht -> कष्ट, kripa -> कृपा).
 * Case matters for a few letters: T Th D Dh N Sh (retroflex), A I U (long
 * vowels), R (ऋ / ृ), M (anusvara), H (visarga after a vowel), ~ (chandrabindu).
 */
(function () {
  "use strict";

  var HALANT = "्", ANUSVARA = "ं", CHANDRA = "ँ", VISARGA = "ः";

  // Consonant tokens (Devanagari value may be a conjunct).
  var CONS = {
    ksh: "क्ष", chh: "छ", cch: "च्छ", shh: "ष",
    kh: "ख", gh: "घ", ch: "च", Ch: "छ", jh: "झ", Th: "ठ", Dh: "ढ", th: "थ", dh: "ध",
    ph: "फ", bh: "भ", sh: "श", Sh: "ष", gy: "ज्ञ",
    k: "क", g: "ग", c: "क", j: "ज", T: "ट", D: "ड", N: "ण", t: "त", d: "द", n: "न",
    p: "प", f: "फ", b: "ब", m: "म", y: "य", r: "र", l: "ल", L: "ळ", v: "व", w: "व",
    s: "स", h: "ह", x: "क्ष", q: "क", z: "ज"
  };

  // Vowel tokens: [independent letter, matra].
  var VOW = {
    aa: ["आ", "ा"], A: ["आ", "ा"], ai: ["ऐ", "ै"], au: ["औ", "ौ"], ei: ["ए", "े"],
    ee: ["ई", "ी"], ii: ["ई", "ी"], I: ["ई", "ी"], oo: ["ऊ", "ू"], uu: ["ऊ", "ू"], U: ["ऊ", "ू"],
    a: ["अ", ""], i: ["इ", "ि"], u: ["उ", "ु"], e: ["ए", "े"], E: ["ए", "े"], o: ["ओ", "ो"], O: ["ओ", "ो"],
    R: ["ऋ", "ृ"]
  };

  // Consonants before which n / m turn into anusvara.
  var ANUS_N = { k: 1, kh: 1, g: 1, gh: 1, c: 1, ch: 1, chh: 1, cch: 1, Ch: 1, j: 1, jh: 1,
    T: 1, Th: 1, D: 1, Dh: 1, t: 1, th: 1, d: 1, dh: 1, p: 1, ph: 1, f: 1, b: 1, bh: 1,
    s: 1, sh: 1, Sh: 1, shh: 1, ksh: 1, x: 1, q: 1, z: 1 };
  var ANUS_M = { p: 1, ph: 1, f: 1, b: 1, bh: 1 };

  // Common words -> natural spelling (keys are lowercase roman).
  var DICT = {};
  function addWords(list) {
    var parts = list.split(/\s*;\s*/), i, kv, keys, j;
    for (i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      kv = parts[i].split("=");
      keys = kv[0].split(",");
      for (j = 0; j < keys.length; j++) DICT[keys[j].trim()] = kv[1].trim();
    }
  }
  addWords(
    "main,mai,mei=मैं; mein,me,men=में; hai=है; hain,hei=हैं; nahi,nahin,nahee,nhi=नहीं; na=न; mat=मत;" +
    "bharat,bhaarat=भारत; hindi=हिंदी; ram=राम; aap,ap=आप; kya=क्या; kyon,kyun,kyu,kyo=क्यों;" +
    "kaise,kese=कैसे; kaisa=कैसा; kaisi=कैसी; aur,or=और; yah,yeh=यह; ye=ये; vah,wah,woh=वह; wo,vo=वो;" +
    "tha=था; thi=थी; the=थे; ka=का; ki=की; ke=के; ko=को; se=से; ne=ने; par=पर; pe=पे; bhi=भी; to=तो; hi=ही;" +
    "ek=एक; do=दो; teen,tin=तीन; char,chaar=चार; paanch,panch=पाँच; das=दस; sau=सौ;" +
    "sarkar,sarkaar=सरकार; desh=देश; rajya=राज्य; namaste,namastey=नमस्ते;" +
    "dhanyavad,dhanyavaad,dhanyawad,dhanyawaad=धन्यवाद; shiksha=शिक्षा; pariksha,priksha=परीक्षा;" +
    "typing=टाइपिंग; hum,ham=हम; tum=तुम; tu=तू; mera=मेरा; meri=मेरी; mere=मेरे; tera=तेरा; teri=तेरी;" +
    "tumhara=तुम्हारा; hamara=हमारा; hamari=हमारी; uska=उसका; uski=उसकी; uske=उसके; unka=उनका;" +
    "unki=उनकी; unke=उनके; iska=इसका; iski=इसकी; inka=इनका; apna=अपना; apni=अपनी; apne=अपने;" +
    "ab=अब; jab=जब; tab=तब; kab=कब; kahan,kahaan=कहाँ; yahan,yahaan=यहाँ; wahan,vahan,wahaan=वहाँ;" +
    "kahin=कहीं; yahin=यहीं; wahin=वहीं; kaun=कौन; kitna=कितना; kitne=कितने; bahut,bahot=बहुत;" +
    "accha,achha,acha,achchha=अच्छा; acchi,achhi,achi=अच्छी; theek,thik=ठीक; haan,han=हाँ;" +
    "kar=कर; karo=करो; kiya=किया; gaya=गया; gayi,gai=गई; gaye,gae=गए; hua,huaa=हुआ; hue=हुए; hui=हुई;" +
    "raha=रहा; rahi=रही; rahe=रहे; sakta=सकता; sakte=सकते; sakti=सकती; chahiye,chahie=चाहिए;" +
    "lekin=लेकिन; kyonki,kyunki,kyuki=क्योंकि; agar=अगर; phir,fir=फिर; sab=सब; sabhi=सभी; log=लोग;" +
    "logon=लोगों; din=दिन; raat,rat=रात; saal=साल; samay=समय; pani,paani=पानी; ghar=घर; kaam=काम;" +
    "naam=नाम; baat=बात; duniya=दुनिया; jeevan,jivan=जीवन; pyar,pyaar=प्यार; dost=दोस्त; bhai=भाई;" +
    "behen,bahan=बहन; maa,ma=माँ; pita=पिता; mata=माता; beta=बेटा; beti=बेटी;" +
    "bachcha,baccha,bacha=बच्चा; bachche,bacche,bache=बच्चे; school=स्कूल; computer=कंप्यूटर;" +
    "keyboard=कीबोर्ड; exam=एग्जाम; test=टेस्ट; speed=स्पीड; india=इंडिया; hindustan=हिंदुस्तान;" +
    "rashtra=राष्ट्र; rashtriya=राष्ट्रीय; sansad=संसद; samvidhan,sanvidhan=संविधान; pradhan=प्रधान;" +
    "mantri=मंत्री; pradhanmantri=प्रधानमंत्री; gyan,gyaan=ज्ञान; vigyan,vigyaan=विज्ञान; bhagya=भाग्य;" +
    "yogya=योग्य; prashn,prashna=प्रश्न; uttar=उत्तर; vidyalay,vidyalaya=विद्यालय; adhyapak=अध्यापक;" +
    "chhatra,chatra=छात्र; naukri,naukari=नौकरी; kaksha=कक्षा; bhartiya,bharatiya,bhaartiya=भारतीय;" +
    "prem=प्रेम; sundar=सुंदर; bada=बड़ा; badi=बड़ी; bade=बड़े; padhai=पढ़ाई; padhna=पढ़ना; padho=पढ़ो;" +
    "ladka=लड़का; ladki=लड़की; ladke=लड़के; ladkon=लड़कों; ladkiyan,ladkiyaan=लड़कियाँ; sadak=सड़क; thoda=थोड़ा; thodi=थोड़ी; ghoda=घोड़ा;" +
    "chhota,chota=छोटा; chhoti,choti=छोटी; kuch,kuchh=कुछ; sirf=सिर्फ; zyada,jyada=ज्यादा; kam=कम;" +
    "abhi=अभी; kabhi=कभी; sabse=सबसे; aaj,aj=आज; kal=कल; subah=सुबह; shaam,sham=शाम; khana=खाना;" +
    "jana=जाना; aana,ana=आना; likhna=लिखना; rishi=ऋषि; ritu=ऋतु; krishi=कृषि; kripya,kripaya=कृपया;" +
    "kripa=कृपा; krishna=कृष्ण; prithvi=पृथ्वी; hriday,hridaya=हृदय; drishti=दृष्टि; vriksh=वृक्ष;" +
    "mrityu=मृत्यु; grih=गृह; srishti=सृष्टि; shri,shree,sri=श्री; shrimati,shreemati=श्रीमती; ji=जी;" +
    "hoon,hun,hu=हूँ; ho=हो; unhe,unhen=उन्हें; inhe,inhen=इन्हें; unhone,unhonne=उन्होंने;" +
    "maine=मैंने; hamein,hame,humein=हमें; tumhe,tumhen=तुम्हें; mujhe=मुझे; tujhe=तुझे; koi=कोई;" +
    "kisi=किसी; liye,liey,lie=लिए; saath,sath=साथ; bina=बिना; tak=तक; gaon,gaanv,gaav=गाँव;" +
    "shahar,sheher=शहर; rupaye,rupye,rupay=रुपये; paisa=पैसा; vikas,vikaas=विकास; yojana=योजना;" +
    "vishay=विषय; bhasha=भाषा; angrezi,angreji=अंग्रेजी; vyakti=व्यक्ति; samasya=समस्या;" +
    "suvidha=सुविधा; sahayata=सहायता; adhikar,adhikaar=अधिकार; karya,kary=कार्य; dharm,dharma=धर्म;" +
    "karm,karma=कर्म; purv,poorv=पूर्व; nirnay=निर्णय; prakriya=प्रक्रिया; arthik,aarthik=आर्थिक;" +
    "kriya=क्रिया; dwara,dvara=द्वारा; kartavya=कर्तव्य; sarvochch=सर्वोच्च; atah=अतः; dukh=दुख;" +
    "sukh=सुख; hota=होता; hoti=होती; hote=होते; diya=दिया; liya=लिया; kitab,kitaab=किताब; bhi=भी;" +
    "jaisa=जैसा; waisa,vaisa=वैसा; aisa=ऐसा; aise=ऐसे; kaha=कहा; kahna=कहना; chalo=चलो; jaldi=जल्दी;" +
    "sahi=सही; galat=गलत; hamesha=हमेशा; zaroor,jaroor,zarur,jarur=जरूर; zindagi,jindagi=जिंदगी;" +
    "matlab=मतलब; rajdhani=राजधानी; vishva,vishwa=विश्व; bhagwan,bhagvan=भगवान; guru=गुरु;" +
    "yatra,yaatra=यात्रा; matra,maatra=मात्रा; vidya=विद्या; kanya=कन्या; sandhya=संध्या;" +
    "sankhya=संख्या; brahm,brahma=ब्रह्म; chihn,chinh=चिह्न; upar,oopar=ऊपर; swagat=स्वागत;" +
    "samachar=समाचार; nagrik=नागरिक; shuru=शुरू; isliye,isiliye=इसलिए;" +
    "rehta,rahta=रहता; rehte,rahte=रहते; rehti,rahti=रहती; rehna,rahna=रहना; kehta,kahta=कहता;" +
    "kehte,kahte=कहते; kehna=कहना; pehle,pahle=पहले; pehla,pahla=पहला; pehli,pahli=पहली; " +
    "dilli=दिल्ली; mumbai=मुंबई; hindu=हिंदू; aapka=आपका; aapki=आपकी; aapke=आपके"
  );

  // Longest-first token lists.
  function sortedKeys(o) {
    return Object.keys(o).sort(function (a, b) { return b.length - a.length; });
  }
  var ALL = {}, k;
  for (k in CONS) ALL[k] = { t: "c", v: CONS[k] };
  for (k in VOW) ALL[k] = { t: "v", v: VOW[k] };
  ALL.M = { t: "anus" };
  ALL.H = { t: "H" };
  ALL["~"] = { t: "chandra" };
  var KEYS = sortedKeys(ALL);

  function tokenize(word) {
    var toks = [], i = 0, j, key, found, lower, step;
    while (i < word.length) {
      found = null;
      for (j = 0; j < KEYS.length; j++) {
        key = KEYS[j];
        if (word.substr(i, key.length) === key) { found = key; break; }
      }
      step = found ? found.length : 1;
      if (!found) {
        // Unknown uppercase letter: fall back to its lowercase meaning.
        lower = word.charAt(i).toLowerCase();
        if (ALL[lower]) found = lower;
      }
      if (found) {
        toks.push({ key: found, t: ALL[found].t, v: ALL[found].v });
        i += step;
      } else {
        toks.push({ key: word.charAt(i), t: "raw", v: word.charAt(i) });
        i++;
      }
    }
    return toks;
  }

  /*
   * Should a typed final "i" after consonant tok[n-2] stay short (ि)?
   * Covers Sanskrit-style endings: शक्ति, शांति, सिद्धि, स्थिति, विधि, प्रगति.
   */
  function shortFinalI(toks, n, info) {
    var c = toks[n - 2], before = toks[n - 3];
    if (!c || c.t !== "c") return false;
    if (c.key === "t" || c.key === "T") {
      // shakti, prapti, shanti — but not dharti (र्त), dosti / masti (स्त).
      if ((info.cluster && info.cluster !== "r" && info.cluster !== "s") || info.afterAnus) return true;
    }
    if (c.key === "dh" && info.cluster === "d") return true;
    if ((c.key === "t" || c.key === "dh") && !info.cluster && before &&
        before.t === "v" && (before.key === "i" || before.key === "a")) return true;
    return false;
  }

  var LONG_AA = { aa: 1, A: 1 };
  // "C + ri + consonant" -> C + ृ for these (kripa, prithvi, drishti, sanskriti).
  var RI_OK = { k: 1, g: 1, gh: 1, d: 1, dh: 1, p: 1, v: 1, w: 1, m: 1, h: 1, s: 1, n: 1, bh: 1 };
  // Word-final syllables before which a typed "C C" keeps the schwa of the
  // first consonant (karna -> करना, chalta -> चलता, kamla -> कमला)...
  var SCHWA_END = { n: { a: 1, e: 1, i: 1, o: 1 }, t: { a: 1, e: 1 }, l: { a: 1, e: 1, i: 1 } };
  // ...unless the pair is a common conjunct (patni, kutta, sasta, billi).
  var SCHWA_NOT = { n: { t: 1 }, t: { t: 1, s: 1, sh: 1, Sh: 1, k: 1, p: 1, x: 1, ksh: 1, T: 1 }, l: { l: 1, k: 1 } };

  var SCHWA_PAIR = { g: { d: 1, b: 1 }, j: { d: 1, b: 1 }, z: { d: 1, b: 1 }, d: { m: 1 } };

  function endsWithSchwaSyllable(toks, j) {
    var c = toks[j], v = toks[j + 1];
    return !!(c && v && j + 2 === toks.length && c.t === "c" && v.t === "v" &&
      SCHWA_END[c.key] && SCHWA_END[c.key][v.key]);
  }

  // toks[i] directly follows consonant toks[i-1]: keep an "a" between them?
  function keepSchwa(toks, i) {
    var prev = toks[i - 1], before = toks[i - 2];
    if (!before || before.t !== "v") return false;          // prev must be a lone consonant
    if (prev.key === "h") return true;                        // sahmat, mehnat, pahla
    // -kar participle: milkar, dekhkar, sunkar (not puraskar).
    if (toks[i].key === "k" && i + 3 === toks.length && toks[i + 1].key === "a" &&
        toks[i + 2].key === "r" && prev.key !== "s" && prev.key !== "sh") return true;
    // Rarely-conjunct pairs: aadmi, yogdan, mazdoor, majboor.
    if (SCHWA_PAIR[prev.key] && SCHWA_PAIR[prev.key][toks[i].key] && toks[i + 1] &&
        toks[i + 1].t === "v") return true;
    return endsWithSchwaSyllable(toks, i) && !SCHWA_NOT[toks[i].key][prev.key];
  }

  /*
   * Compound of a known word + the rest (rashtrapati, karyakram, deshbhakti,
   * mataji): longest dictionary prefix of 4+ letters, followed by another
   * dictionary word or by 3+ letters starting with a consonant.
   */
  function compound(lw) {
    var cut, head, rest;
    for (cut = lw.length - 2; cut >= 4; cut--) {
      head = lw.slice(0, cut);
      rest = lw.slice(cut);
      if (!DICT.hasOwnProperty(head)) continue;
      if (DICT.hasOwnProperty(rest)) return DICT[head] + DICT[rest];
      if (rest.length >= 3 && /^[^aeiou]/.test(rest)) return DICT[head] + convert(rest, { noDict: true });
    }
    return "";
  }

  function convert(word, opts) {
    opts = opts || {};
    if (!word) return "";
    // Sentence/name case ("Bharat") and ALL CAPS are treated as lowercase.
    if (/^[A-Z][a-z]+$/.test(word) || (/^[A-Z]{2,}$/.test(word))) word = word.toLowerCase();
    if (!opts.noDict && /^[a-z]+$/i.test(word)) {
      var lw = word.toLowerCase();
      if (DICT.hasOwnProperty(lw)) return DICT[lw];
      var comp = compound(lw);
      if (comp) return comp;
    }

    var toks = tokenize(word), n = toks.length, out = "", state = "start";
    var info = { cluster: null, afterAnus: false }, prevCons = null, anusJustNow = false;
    var retroNext = false, i, tok, next, isLast, v, before;

    for (i = 0; i < n; i++) {
      tok = toks[i];
      next = toks[i + 1];
      isLast = i === n - 1;

      if (tok.t === "H") {
        if (state === "vowel") { out += VISARGA; continue; }   // duHkh -> दुःख
        tok = { key: "h", t: "c", v: "ह" };
      }

      if (tok.t === "c") {
        // Oblique plural / verb endings: doston -> दोस्तों, baaten -> बातें.
        if (isLast && tok.key === "n" && word.length >= 5 && state === "vowel" &&
            toks[i - 2] && toks[i - 2].t === "c" && /^(o|e|ei)$/.test(toks[i - 1].key) &&
            !opts.noDict) {
          out += ANUSVARA;
          continue;
        }
        // n / m / N before a consonant -> anusvara (but janta -> जनता).
        if (!opts.noAnusvara && state === "vowel" && next && next.t === "c" &&
            (((tok.key === "n" || tok.key === "N") && ANUS_N[next.key]) ||
             (tok.key === "m" && ANUS_M[next.key])) &&
            !(tok.key === "n" && next.key === "t" && endsWithSchwaSyllable(toks, i + 1))) {
          out += ANUSVARA;
          anusJustNow = true;
          continue;
        }
        v = tok.v;
        // श before t/th is almost always ष्ट / ष्ठ (kasht, shreshth).
        if (retroNext) {
          if (tok.key === "t") v = "ट";
          else if (tok.key === "th") v = "ठ";
        }
        retroNext = false;
        if (tok.key === "sh" && next && (next.key === "t" || next.key === "th")) v = "ष";
        if (v === "ष") retroNext = true;

        var joined = state === "cons" && !keepSchwa(toks, i);
        info = { cluster: joined ? prevCons : null, afterAnus: anusJustNow };
        if (joined) out += HALANT;
        out += v;
        prevCons = tok.key;
        anusJustNow = false;

        // kripa -> कृपा, prithvi -> पृथ्वी (C + ri + consonant).
        // Needs a consonant (not y: kriya, priya) and then more letters after "ri"
        // so that nagrik / grih-like endings stay रि.
        if (RI_OK[tok.key] && toks[i + 1] && toks[i + 1].key === "r" && toks[i + 2] &&
            toks[i + 2].key === "i" && toks[i + 3] && toks[i + 3].t === "c" &&
            toks[i + 3].key !== "y" && toks[i + 4]) {
          out += "ृ";
          i += 2;
          state = "vowel";
          continue;
        }
        state = "cons";
        continue;
      }

      if (tok.t === "v") {
        if (state === "cons") {
          if (isLast && tok.key === "a" && !opts.finalShort) {
            before = toks[n - 4];
            if (prevCons === "y" && info.cluster) out += "";            // lakshya, satya
            else if (prevCons === "r" && /^[tdTD]$/.test(info.cluster || "") &&
                     !(before && LONG_AA[before.key])) out += "";       // mitra, chandra
            else out += "ा";
          } else if (isLast && tok.key === "i" && !opts.finalShort && !shortFinalI(toks, n, info)) {
            out += "ी";
          } else if (isLast && tok.key === "ai" && word.length >= 5) {
            out += "ाई";                                                // mithai, kamai
          } else {
            out += tok.v[1];
          }
        } else if (isLast && state === "vowel" && tok.key === "a") {
          out += "आ";           // hua -> हुआ
        } else if (isLast && state === "vowel" && tok.key === "i") {
          out += "ई";           // aai -> आई
        } else {
          out += tok.v[0];
        }
        state = "vowel";
        anusJustNow = false;
        continue;
      }

      if (tok.t === "anus") { out += ANUSVARA; state = "vowel"; anusJustNow = true; continue; }
      if (tok.t === "chandra") { out += CHANDRA; state = "vowel"; continue; }
      // Anything unexpected is kept as-is.
      out += tok.v;
      state = "start";
    }
    return out;
  }

  function wordToHindi(word) {
    return convert(word, {});
  }

  function toHindi(text) {
    if (!text) return "";
    var out = String(text).replace(/[A-Za-z~]+/g, function (w) { return convert(w, {}); });
    // Full stop after a Hindi word at a sentence boundary -> danda.
    return out.replace(/([ऀ-ॿ])\.(?=\s|$)/g, "$1।");
  }

  /** Up to 4 alternative spellings, best guess first. */
  function suggestions(word) {
    var list = [], seen = {};
    function add(s) { if (s && !seen[s] && list.length < 4) { seen[s] = 1; list.push(s); } }
    if (!word) return list;
    var best = convert(word, {});
    add(best);
    add(convert(word, { noDict: true }));
    // Long "aa" before anusvara (shanti -> शांति).
    add(best.replace(/([\u0915-\u0939])\u0902/, "$1\u093E\u0902"));
    add(convert(word, { noDict: true, finalShort: true }));
    add(convert(word, { noDict: true, noAnusvara: true }));
    // Common sound swaps on the best guess.
    var swaps = [["स", "श"], ["श", "स"], ["त", "ट"], ["द", "ड"], ["थ", "ठ"], ["न", "ण"]];
    for (var i = 0; i < swaps.length; i++) {
      if (best.indexOf(swaps[i][0]) !== -1) add(best.replace(swaps[i][0], swaps[i][1]));
    }
    // ड / ढ -> ड़ / ढ़ (sadak -> सड़क).
    add(best.replace(/([डढ])(?!\u093C)/, "$1\u093C"));
    return list;
  }

  window.TETranslit = {
    toHindi: toHindi,
    wordToHindi: wordToHindi,
    suggestions: suggestions
  };
})();
