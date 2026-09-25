/*
 * Typing course curriculum. Each lesson becomes a static page with its drill
 * embedded. Items are { d: display text, k: key sequence on a US keyboard }.
 */
global.window = global.window || {};
require("../assets/js/hindi.js");
const H = global.window.TEHindi;

/* deterministic random so builds are stable */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

/* ---------------- English ---------------- */
const EN_WORDS = (
  "a as ask all fall lad sad dad add flask salad alas has had hall half shall dash flash glass flag gas gash lash " +
  "sash hash jag jags lag sag slag lads dads asks falls halls flags glad gall gala " +
  "is it if he she his her hi hid hide side slide life file field fish fire fries dish lid kid kids like likes hike " +
  "sea seal seed fled feel feed deal idea ideas said sail aid laid jail ale sale kale fake lake shake desk silk ski " +
  "red rid ride read rear free fresh share shred shire dress rare hard jar far farm fair hair here herd her " +
  "us use used sure rush hurt fur rude rule full fuel dull hull just jug hug huge sugar ruler run " +
  "the that this they these there their three tree test tea tray try yet yes day days stay key they year sky style " +
  "task treat tried trust truth type tight tide thy dry fry shy july duty study today state stated street strut " +
  "we was way what why who with white write word work world wish wife wide weed well will wall owl low slow show " +
  "or our out one own old of off oil to too two go got goal gold hold told fold sold road load float power flow " +
  "quite quiet quest quote quick quality equal equity queue require request squad squash " +
  "put paper people plus plate play place price pride proper opera open top stop shop port sport support type " +
  "can come came clock class clear cost case cash cause car city create each such much catch coach " +
  "me my more most make made main many much time come some same team same money mouse member moment matter " +
  "via vote very value visit voice video vital even ever over save move give live view vast visa " +
  "no not now new next never name need nine near nation union run man men sun then when than into since " +
  "box fox tax six mix exit extra exam exact expert index taxi next text " +
  "be by but big boy best book both bring build back base bank able above about table cable number " +
  "zoo zero size prize lazy crazy zone quiz dozen maze " +
  "office officer notice order public process system service official report record right rights court judge " +
  "india indian nation national country government policy people village district state capital speed typing " +
  "keyboard practice exam test passage minute accuracy error words skill daily lesson finger home row"
).split(" ");

function enWordsFrom(letters) {
  const set = new Set(letters.split(""));
  return [...new Set(EN_WORDS)].filter((w) => w.split("").every((c) => set.has(c)));
}
function enDrill(newKeys, known, seed, count = 36) {
  const r = rng(seed);
  const items = [];
  const nk = newKeys.split("");
  // 1) new-key patterns
  for (let i = 0; i < 10; i++) {
    const len = 2 + Math.floor(r() * 3);
    let s = "";
    for (let j = 0; j < len; j++) s += pick(i < 5 ? nk : (known + newKeys).split(""), r);
    items.push(s);
  }
  // 2) real words
  const words = enWordsFrom(known + newKeys).filter((w) => nk.some((k) => w.includes(k)));
  const pool = words.length >= 4 ? words : enWordsFrom(known + newKeys);
  while (items.length < count && pool.length) items.push(pick(pool, r));
  return items.map((w) => ({ d: w, k: w }));
}

const EN_LESSONS = [];
(function () {
  const steps = [
    ["fj", "", "Home row: F and J", "Place your index fingers on F and J — feel the small bumps."],
    ["dk", "fj", "Home row: D and K", "Middle fingers rest on D and K."],
    ["sl", "fjdk", "Home row: S and L", "Ring fingers rest on S and L."],
    ["a;", "fjdksl", "Home row: A and ;", "Little fingers rest on A and semicolon."],
    ["gh", "fjdksla;", "Home row: G and H", "Stretch index fingers inward to reach G and H."],
    ["ei", "fjdkslagh", "Top row: E and I", "Middle fingers reach up to E and I."],
    ["ru", "fjdkslaghei", "Top row: R and U", "Index fingers reach up to R and U."],
    ["ty", "fjdkslagheiru", "Top row: T and Y", "Index fingers stretch up-inward to T and Y."],
    ["wo", "fjdkslagheiruty", "Top row: W and O", "Ring fingers reach up to W and O."],
    ["qp", "fjdkslagheirutywo", "Top row: Q and P", "Little fingers reach up to Q and P."],
    ["cm", "fjdkslagheirutywoqp", "Bottom row: C and M", "Middle finger down to C, right index down to M."],
    ["vn", "fjdkslagheirutywoqpcm", "Bottom row: V and N", "Index fingers reach down to V and N."],
    ["xb", "fjdkslagheirutywoqpcmvn", "Bottom row: X and B", "Left ring finger to X, left index to B."],
    ["z", "fjdkslagheirutywoqpcmvnxb", "Bottom row: Z", "Left little finger reaches down to Z."]
  ];
  steps.forEach((s, i) => {
    EN_LESSONS.push({
      title: s[2], desc: s[3], keys: s[0].toUpperCase().split("").join(" "),
      items: enDrill(s[0], s[1], 100 + i), target: 12 + i
    });
  });
  const r = rng(77);
  const all = enWordsFrom("abcdefghijklmnopqrstuvwxyz");
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  EN_LESSONS.push({
    title: "Capital letters with Shift", desc: "Hold Shift with the little finger of the opposite hand.", keys: "Shift",
    items: Array.from({ length: 30 }, () => { const w = cap(pick(all, r)); return { d: w, k: w }; }), target: 22
  });
  const punct = ["yes,", "no.", "wait;", "why?", "note:", "it's", "don't", "well-known", "(test)", "end.", "first,", "then;", "okay?", "done!", "self-help"];
  EN_LESSONS.push({
    title: "Punctuation marks", desc: "Comma, full stop, semicolon, colon, question mark, apostrophe and hyphen.", keys: ", . ; : ? ' -",
    items: Array.from({ length: 30 }, (_, i) => { const w = i % 2 ? pick(punct, r) : pick(all, r); return { d: w, k: w }; }), target: 22
  });
  const nums = ["10", "25", "2026", "365", "47", "89", "100", "1950", "15", "72", "3", "64", "808", "1234", "567", "90", "11", "246", "1947", "30"];
  EN_LESSONS.push({
    title: "Number row", desc: "Reach up from the home row; return your fingers after each number.", keys: "1 2 3 4 5 6 7 8 9 0",
    items: Array.from({ length: 30 }, () => { const w = pick(nums, r); return { d: w, k: w }; }), target: 18
  });
  const common = "the of and to in is it you that he was for on are with as his they be at one have this from or had by word but what some we can out other were all there when up use your how said an each she which do their time if will way about many then them write would like so these her long make thing see him two has look more day could go come did number sound no most people my over know water than call first who may down side been now find".split(" ");
  EN_LESSONS.push({
    title: "100 most common words", desc: "Build word-level rhythm with the words you type most often.", keys: "all keys",
    items: Array.from({ length: 45 }, () => { const w = pick(common, r); return { d: w, k: w }; }), target: 28
  });
  const sentences = [
    "India is a union of states.", "Practice every day to improve your speed.", "The court will hear the matter on Monday.",
    "Keep your eyes on the screen, not the keys.", "Accuracy first, speed will follow.", "The officer signed the order in the morning.",
    "Every citizen has the right to equality.", "Type slowly and correctly at the start.", "The exam passage has capital letters and commas."
  ];
  EN_LESSONS.push({
    title: "Sentence practice", desc: "Full sentences with capitals and punctuation.", keys: "sentences",
    items: sentences.join(" ").split(" ").map((w) => ({ d: w, k: w })), target: 30
  });
  const para = "The Constitution of India is the supreme law of the country. It lays down the framework of political principles, sets out the powers and duties of government institutions, and guarantees fundamental rights to every citizen. Regular typing practice on such passages helps candidates build speed as well as accuracy for the skill test.";
  EN_LESSONS.push({
    title: "Exam-style paragraph", desc: "A short exam-style passage — aim for your target speed with 95% accuracy.", keys: "paragraph",
    items: para.split(" ").map((w) => ({ d: w, k: w })), target: 32
  });
})();

/* ---------------- Hindi Inscript ---------------- */
function inscriptKeys(word) {
  let k = "";
  for (const ch of word.normalize("NFC")) {
    const key = H.INSCRIPT_REVERSE[ch];
    if (key == null) throw new Error("No Inscript key for '" + ch + "' in " + word);
    k += key;
  }
  return k;
}
function hiItems(words, keyFn, seed, count) {
  const r = rng(seed);
  const list = words.split(/\s+/).filter(Boolean);
  const out = [];
  if (!count) return list.map((w) => ({ d: w, k: keyFn(w) }));
  while (out.length < count) out.push(pick(list, r));
  return out.map((w) => ({ d: w, k: keyFn(w) }));
}

const INSCRIPT_LESSONS = [
  ["होम रो: दायाँ हाथ (प र क त च ट)", "Right-hand home row consonants: H J K L ; '", "h j k l ; '",
    "कप कर पर तक तट रत चट कट पट चप रट पत कपट चपत तप टक टकटक चरक करतप", 30, 8],
  ["होम रो: बायाँ हाथ (ो े ् ि ु)", "Left-hand home row matras: A S D F G — D is the halant (्).", "a s d f g",
    "को के कि कु पे रे तो पेट रोक टोक रेत तोप कोट चुप चोर पुत्र चित्र कुरते तेरे चोट पोत रोटे कित", 30, 9],
  ["ऊपरी पंक्ति: दायाँ हाथ (ब ह ग द ज ड)", "Top row right: Y U I O P [ ] — ] adds the nukta (़).", "y u i o p [ ]",
    "बहुत जग गज हद जगह देह गोद जड़ पेड़ गुड़ जोड़ तोड़ बोरे दोहे बेहद गड़बड़ बड़ दबोच बहु जुड़", 30, 10],
  ["ऊपरी पंक्ति: बायाँ हाथ (ौ ै ा ी ू)", "Top row left matras: Q W E R T.", "q w e r t",
    "बात रात गीत जीत रीत ताकत बाहर पूजा पैर कैद पैदा दीपक ताजी हीरा पूरा कूद जूता रूप टीका दौड़ चौड़ा बौद्ध गौर", 32, 11],
  ["निचली पंक्ति (ं म न व ल स य)", "Bottom row: X C V B N M / — X is anusvara (ं).", "x c v b n m /",
    "मन नमक समय सड़क सरल कमल नल वन सब यह वह संसार मंगल सामान विमान नया लोग सेवा मैं नमन समाज सवाल लाल वायु मौसम मिलना", 34, 12],
  ["शिफ्ट होम रो (ओ ए अ इ उ फ ख थ छ ठ)", "Shift + home row: independent vowels and aspirated consonants.", "Shift + A S D F G H K L ; '",
    "ओर एक अब इस उस फल खेल थाली छात्र ठीक अपना उठना एकता फसल खाना साथ कुछ पीछे मीठा अच्छा उत्तर इमारत ओला", 34, 12],
  ["शिफ्ट ऊपरी पंक्ति (औ ऐ आ ई ऊ भ घ ध झ ढ ञ)", "Shift + top row: long vowels and more aspirated consonants.", "Shift + Q W E R T Y I O P {",
    "और ऐसा आज ईमान ऊपर भारत घर धन झील ढोल आदमी आधार धरती घटना समझ पढ़ना भीड़ धीरज झरना घूमना", 34, 13],
  ["शिफ्ट निचली पंक्ति (ँ ण श ष ।)", "Shift + bottom row: chandrabindu, ण, श, ष and purna viram (Shift + .).", "Shift + X C M < >",
    "कारण शहर भाषा शिक्षा चाँद हँसी गाँव दोष विशेष गुण प्राण पूर्ण शासन वर्षा शांति। भाषण निर्माण", 34, 13],
  ["संयुक्ताक्षर (क्ष त्र ज्ञ श्र, र्)", "Conjunct letters are made with the halant key D between consonants.", "d (halant)",
    "क्षेत्र त्रिकोण ज्ञान श्रम कर्म धर्म प्रदेश ग्राम विद्यालय स्वतंत्र राष्ट्र पत्र मित्र शुद्ध प्रश्न सम्मान अध्यक्ष न्याय स्थान", 34, 14],
  ["सबसे अधिक प्रयुक्त शब्द", "The most frequent Hindi words — build word rhythm.", "all keys",
    "है के में की और को से का यह एक पर भी नहीं तो था हैं कि लिए साथ कर कहा गया अपने बहुत सकते होता रहे वे इस उन", 45, 16]
].map(([title, desc, keys, words, count, target], i) => ({
  title, desc, keys, target, items: hiItems(words, inscriptKeys, 300 + i, count)
}));
INSCRIPT_LESSONS.push({
  title: "वाक्य अभ्यास", desc: "Full Hindi sentences with purna viram.", keys: "sentences", target: 18,
  items: hiItems("भारत एक विशाल देश है। हमें प्रतिदिन अभ्यास करना चाहिए। न्यायालय ने आदेश जारी किया। सही टाइपिंग से गति अपने आप बढ़ती है। परीक्षा में धैर्य रखना आवश्यक है।", inscriptKeys)
});
INSCRIPT_LESSONS.push({
  title: "परीक्षा अनुच्छेद", desc: "An exam-style Hindi paragraph.", keys: "paragraph", target: 20,
  items: hiItems("भारत का संविधान देश का सर्वोच्च कानून है। यह नागरिकों को मौलिक अधिकार प्रदान करता है और सरकार के विभिन्न अंगों की शक्तियों का निर्धारण करता है। नियमित अभ्यास से टाइपिंग की गति और शुद्धता दोनों में सुधार होता है।", inscriptKeys)
});

/* ---------------- Remington GAIL / Krutidev ---------------- */
function remItems(keys, seed, count) {
  const r = rng(seed);
  const list = keys.split(/\s+/).filter(Boolean);
  const chosen = count ? Array.from({ length: count }, () => pick(list, r)) : list;
  return chosen.map((k) => ({ d: H.krutiToUnicode(k), k }));
}
const REM_LESSONS = [
  ["होम रो: क ा र स", "Home row start: D (क), K (ा), J (र), L (स).", "d k j l",
    "dj lj jl dl dkj lkj jkl dkl ljl djk lkl jkj", 28, 8],
  ["होम रो: ि ह ी य श ं े", "Rest of the home row: F (ि, typed before the letter), G, H, ;, ', A, S.", "f g h ; ' a s",
    "fd;k dgk jgs lkjk gkj jkg gh dh lh jh dsl ;g 'ksj 'kk gS fdl lgh ;gk", 30, 9],
  ["ऊपरी पंक्ति: ु ू म त ज ल न प व च", "Top row: Q W E R T Y U I O P.", "q w e r t y u i o p",
    "eu ry ty ou pk; dey ljy dke ukd ikuh tu iwjk dqy leku le; ueu jru pkoy ekurk tkudkjh ykyp twrk", 34, 10],
  ["निचली पंक्ति: ग ब अ इ द उ ए ण ध", "Bottom row: X C V B N M , . / — Z (with Shift) will make reph later.", "x c v b n m , . /",
    "vc bu mu ,d xk; cy nl /ku xzke iz'u dkj.k vxj bl ml /kjrh cgqr vkt ueLdkj fnu xqy", 34, 11],
  ["शिफ्ट होम रो: । ै क् थ् भ् श्र ज्ञ स् रू ष्", "Shift + home row keys. A types the purna viram (।).", "Shift + A S D F H J K L : \"",
    "Hkkjr gSA lkFk Kku Jfed Lokxr dSls iSlk HkS;k fLFkfr Hkkjrh; :i FkkA 'kkldh; ukxfjd", 34, 12],
  ["शिफ्ट ऊपरी पंक्ति: फ म् त् ज् ल् न् प् व् च् क्ष्", "Shift + top row: mostly half letters used in conjuncts.", "Shift + Q E R T Y U I O P {",
    "Qy Qly fuEu mRrj lTtu vYi vUu O;fDr cPpk {ks= f'k{kk egRo lEeku v/;{k U;k; Li\"V", 34, 13],
  ["शिफ्ट निचली पंक्ति: र् ग् ट ठ छ ड ढ झ घ्", "Shift + bottom row: Z makes reph (र्) — type it after the letter.", "Shift + Z X V B N M < > ?",
    "dk;Z /keZ ekxZ Vksih BaMk NksVk <ksy >hy ?kj ?kaVk cM+k i<+uk dkxt Nk= lw;Z iwoZ", 34, 13],
  ["अंक पंक्ति के चिह्न: त्र द्ध ऋ ः रु", "Number-row symbols: = (त्र), ) (द्ध), _ (ऋ), % (ः), # (रु), ] (comma), - (full stop).", "= ) _ % # ] -",
    "ea=h i= fe= 'kq) cq) _f\"k #i;k vr% =qfV ;q) #fp ek=", 30, 14],
  ["सबसे अधिक प्रयुक्त शब्द", "The most frequent Hindi words in Remington GAIL.", "all keys",
    "gS ds esa dh vkSj dks ls dk ;g ,d ij Hkh ugha rks Fkk gSa fd fy, lkFk dj dgk x;k vius cgqr ldrs gksrk jgs os bl mu", 45, 16]
].map(([title, desc, keys, list, count, target], i) => ({
  title, desc, keys, target, items: remItems(list, 500 + i, count)
}));
REM_LESSONS.push({
  title: "वाक्य अभ्यास", desc: "Full Hindi sentences — A gives the purna viram (।).", keys: "sentences", target: 18,
  items: remItems("Hkkjr ,d fo'kky ns'k gSA gesa izfrfnu vH;kl djuk pkfg,A U;k;ky; us vkns'k tkjh fd;kA lgh Vkbfiax ls xfr vius vki c<+rh gSA")
});
REM_LESSONS.push({
  title: "परीक्षा अनुच्छेद", desc: "An exam-style Hindi paragraph in Remington GAIL.", keys: "paragraph", target: 20,
  items: remItems("Hkkjr dk lafo/kku ns'k dk loksZPp dkuwu gSA ;g ukxfjdksa dks ekSfyd vf/kdkj iznku djrk gS vkSj ljdkj ds fofHkUu vaxksa dh 'kfDr;ksa dk fu/kkZj.k djrk gSA")
});

const courses = [
  {
    slug: "english-typing", name: "English Typing Course", layout: "qwerty", lang: "en", level: "Beginner → Exam ready",
    tagline: "Touch typing from the home row to exam-speed paragraphs.",
    description: "Free English typing course for beginners: learn touch typing key by key — home row, top row, bottom row, capitals, punctuation and numbers — then build exam speed.",
    lessons: EN_LESSONS
  },
  {
    slug: "hindi-mangal-inscript", name: "Hindi Typing Course — Mangal Inscript", layout: "inscript", lang: "hi", level: "Beginner → Exam ready",
    tagline: "Learn the Govt of India standard Unicode Hindi keyboard.",
    description: "Free Hindi typing course in Mangal Inscript (Unicode) layout: learn every Hindi key, matras, halant, conjuncts and exam paragraphs step by step.",
    lessons: INSCRIPT_LESSONS
  },
  {
    slug: "hindi-remington-gail", name: "Hindi Typing Course — Remington GAIL / Krutidev", layout: "remington", lang: "hi", level: "Beginner → Exam ready",
    tagline: "The typewriter layout used with Krutidev 010 in most state exams.",
    description: "Free Hindi typing course in Remington GAIL (Krutidev 010) layout: master the home row, i-matra, reph, half letters and exam paragraphs.",
    lessons: REM_LESSONS
  }
];

// sanity check: every Remington item must convert to Devanagari without leftover Latin letters
courses.forEach((c) => c.lessons.forEach((l, i) => l.items.forEach((it) => {
  if (c.lang === "hi" && /[A-Za-z]/.test(it.d)) throw new Error(`${c.slug} lesson ${i + 1}: '${it.k}' -> '${it.d}'`);
})));

module.exports = { courses };
