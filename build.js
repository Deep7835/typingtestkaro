/*
 * TypingTestKaro static site generator.
 *   node build.js   -> writes the deployable site to ./site
 */
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const { exams, CATEGORIES, LAYOUT_NAMES } = require("./src/data/exams.js");
const { courses } = require("./src/data/courses.js");
const H = global.window.TEHindi; // loaded by courses.js
const { AUTHOR, PH_DECO, SITE, GAMES, TESTS, TOOLS, esc, render, pageHero, faqBlock, faqSchema } = require("./build/layout.js");

const OUT = path.join(__dirname, "site");
global.BUILD_V = Date.now().toString(36); // cache-busting query for CSS/JS
const SRC = path.join(__dirname, "src");
const pages = []; // for sitemap

/* ---------------- fs helpers ---------------- */
function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
function emit(page) {
  const rel = page.path === "/" ? "index.html" : page.path.replace(/^\//, "") + (page.path.endsWith("/") ? "index.html" : "");
  write(rel, render(page, courses));
  if (!page.noindex && page.path !== "/404.html") pages.push({ path: page.path, priority: page.priority || 0.6 });
}
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));
fs.copyFileSync(path.join(SRC, "data/passages.js"), path.join(OUT, "assets/js/passages.js"));
const HAS_MR = fs.existsSync(path.join(SRC, "data/passages-mr.js"));
if (HAS_MR) fs.copyFileSync(path.join(SRC, "data/passages-mr.js"), path.join(OUT, "assets/js/passages-mr.js"));
const HAS_U2K = fs.existsSync(path.join(SRC, "assets/js/unicode-krutidev.js"));
const HAS_TRANSLIT = fs.existsSync(path.join(SRC, "assets/js/translit.js"));

const TEST_JS = ["/assets/js/hindi.js", "/assets/js/passages.js"].concat(HAS_MR ? ["/assets/js/passages-mr.js"] : []).concat(["/assets/js/typing.js"]);
const TEST_CSS = ["/assets/css/typing.css"];
const langName = { en: "English", hi: "Hindi" };
const catName = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));

/* ---------------- blog ---------------- */
function parsePost(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) throw new Error("Bad front matter: " + file);
  const meta = {};
  m[1].split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  meta.slug = path.basename(file, ".md");
  let md = m[2].trim();
  // FAQ extraction: "## FAQs" then "### Q" + answer paragraphs
  const faqs = [];
  const fm = md.match(/\n## FAQs?\s*\n([\s\S]*?)(?=\n## |\s*$)/i);
  if (fm) {
    fm[1].split(/\n### /).slice(1).forEach((chunk) => {
      const [q, ...rest] = chunk.split("\n");
      const a = rest.join("\n").trim();
      if (q && a) faqs.push({ q: q.trim(), a: marked.parseInline(a.split(/\n\n/)[0]) });
    });
  }
  const toc = [];
  const renderer = new marked.Renderer();
  renderer.heading = function (text, level, rawText) {
    const id = rawText.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9ऀ-ॿ]+/g, "-").replace(/^-|-$/g, "");
    if (level === 2) toc.push({ id, text: rawText });
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  };
  renderer.table = function (header, body) {
    return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
  };
  meta.html = marked.parse(md, { renderer });
  meta.toc = toc;
  meta.faqs = faqs;
  meta.words = md.split(/\s+/).length;
  return meta;
}
const posts = fs.readdirSync(path.join(SRC, "content/blog")).filter((f) => f.endsWith(".md"))
  .map((f) => parsePost(path.join(SRC, "content/blog", f)))
  .sort((a, b) => b.date.localeCompare(a.date));
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Blog categories: slug, cover style, glyph and description (used by cards, archive and category pages)
const CAT_META = {
  "Typing Tips": { slug: "typing-tips", glyph: "Aa", desc: "Techniques and practice routines to type faster and more accurately — for beginners and exam aspirants." },
  "Exam Guides": { slug: "exam-guides", glyph: "📝", desc: "Typing test rules, patterns and preparation guides for SSC, RRB, CPCT, High Court and state government exams." },
  "Hindi Typing": { slug: "hindi-typing", glyph: "अ", desc: "Learn Hindi typing in Krutidev, Mangal Inscript and Remington GAIL — from the first key to exam speed." },
  "Keyboard & Layouts": { slug: "keyboard-layouts", glyph: "⌨", desc: "Keyboard layouts, finger placement and layout comparisons to help you choose and master the right one." }
};
const catMeta = (c) => CAT_META[c] || { slug: c.toLowerCase().replace(/[^a-z0-9]+/g, "-"), glyph: "✎", desc: "" };
const monthKey = (d) => d.slice(0, 7);
const fmtMonth = (k) => new Date(k + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });

function postCard(p, featured) {
  const m = catMeta(p.category);
  return `<a class="card post-card${featured ? " post-featured" : ""}" href="/blog/${p.slug}/" data-category="${esc(p.category)}">
    <div class="post-cover cat-${m.slug}" aria-hidden="true"><span class="post-glyph">${m.glyph}</span><span class="post-cover-cat">${esc(p.category)}</span></div>
    <div class="post-body">
      ${featured ? '<span class="badge badge-accent">Latest article</span>' : ""}
      <h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p>
      <div class="post-meta"><span>${fmtDate(p.date)}</span><span>${esc(p.readTime)} read</span><span>${esc(AUTHOR.name)}</span></div>
    </div></a>`;
}

/* ---------------- shared bits ---------------- */
function examCard(e) {
  const sp = e.kdph ? `<span class="badge badge-accent">${e.kdph.toLocaleString("en-IN")} KDPH</span>`
    : Object.entries(e.speed).map(([l, w]) => `<span class="badge ${l === "en" ? "badge-primary" : "badge-accent"}">${langName[l]} ${w} WPM</span>`).join("");
  return `<a class="card exam-card" href="/exams/${e.slug}/"><h3>${esc(e.name)}</h3><p>${esc(e.posts)}</p>
    <div class="card-meta">${sp}<span class="badge">${e.duration} min</span></div></a>`;
}
function testEmbed(attrs) {
  return `<div data-typing-test ${Object.entries(attrs).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ")}>
    <noscript><p>Please enable JavaScript to take the typing test.</p></noscript></div>`;
}
function ctaBand(title, text, href, label) {
  return `<section class="section-sm"><div class="container"><div class="cta-band"><div><h2>${title}</h2><p>${text}</p></div>
    <a class="btn btn-light btn-lg" href="${href}">${label}</a></div></div></section>`;
}
const personRef = {
  "@type": "Person", "@id": SITE.url + AUTHOR.path + "#person", name: AUTHOR.name, url: SITE.url + AUTHOR.path, jobTitle: AUTHOR.role,
  alumniOf: AUTHOR.experience.map((e) => ({ "@type": "Organization", name: e.org }))
};
const orgSchema = {
  "@context": "https://schema.org", "@type": "Organization", name: SITE.name, url: SITE.url,
  logo: SITE.url + "/favicon.svg", email: SITE.email, founder: personRef
};
const authorBox = () => `<aside class="author-box" aria-label="About the author">
  <a class="author-avatar" href="${AUTHOR.path}" aria-hidden="true" tabindex="-1">${AUTHOR.initials}</a>
  <div><span class="eyebrow">Written by</span><h3><a href="${AUTHOR.path}">${esc(AUTHOR.name)}</a></h3>
  <p class="author-role">${esc(AUTHOR.role)}</p><p>${esc(AUTHOR.short)}</p>
  <div class="chips">${AUTHOR.experience.map((e) => `<span class="badge">${esc(e.org)}</span>`).join("")}</div></div>
</aside>`;

/* =====================================================================
   HOME
   ===================================================================== */
(function home() {
  const popular = exams.filter((e) => e.popular);
  const totalLessons = courses.reduce((n, c) => n + c.lessons.length, 0);
  const faqs = [
    { q: "Is this typing test free?", a: "Yes. Every typing test, exam test, course lesson, game and tool on TypingTestKaro is free and works in your browser without installing any software or creating an account." },
    { q: "Can I take a Hindi typing test in Krutidev or Mangal?", a: "Yes. Choose <b>Mangal Inscript</b>, <b>Krutidev 010</b> or <b>Remington GAIL</b> from the layout menu of the test above. The layouts are built in, so you can type Hindi on a normal English keyboard — no Hindi font or keyboard installation needed." },
    { q: "How is typing speed calculated?", a: "Gross WPM = (key depressions ÷ 5) ÷ minutes. Net WPM subtracts your uncorrected mistakes per minute from the gross speed. We also show accuracy, error percentage, KDPH, full mistakes and half mistakes." },
    { q: "What typing speed is needed for SSC and other govt exams?", a: "SSC CHSL LDC/JSA needs 35 WPM in English or 30 WPM in Hindi in 10 minutes; RRB NTPC needs 30 WPM English or 25 WPM Hindi; SSC DEST needs 8,000 key depressions per hour. See the table above and the <a href=\"/exams/\">exam list</a> for every exam." },
    { q: "How should I prepare for a typing test?", a: "Learn the layout first with a <a href=\"/courses/\">free course</a>, then take a 5 or 10-minute test every day to build speed and accuracy. Two weeks before the exam, practise on your <a href=\"/exams/\">exam's test page</a> with highlighting and backspace set as in the real exam." },
    { q: "Does it work on mobile?", a: "Yes, the site works on phones and tablets. For Hindi on a phone, switch on <b>My Hindi IME</b> and use your phone's Hindi keyboard. For real exam practice we recommend a computer keyboard." }
  ];
  const tile = (href, title, sub, icon) => `<a class="link-tile" href="${href}">${icon ? `<span class="lt-icon" aria-hidden="true">${icon}</span>` : ""}<span><b>${title}</b><small>${sub}</small></span></a>`;
  const body = `
<section class="hero hero-3d">
  <div class="hero-orb orb-a" aria-hidden="true"></div><div class="hero-orb orb-b" aria-hidden="true"></div><div class="hero-orb orb-c" aria-hidden="true"></div>
  <div class="container hero-grid">
    <div class="hero-copy">
      <span class="hero-pill"><span class="dot"></span> Free · No signup · Real exam pattern</span>
      <h1>Typing Test for <span class="grad-text">Government Exams</span> — Hindi &amp; English</h1>
      <p class="hero-lead">Practise the exact typing test of SSC, RRB NTPC, CPCT, High Court and ${exams.length}+ state &amp; central exams. Built-in Mangal Inscript, Krutidev and Remington GAIL keyboards with official-style Net WPM scoring.</p>
      <div class="hero-cta">
        <a class="btn btn-light btn-lg btn-glow" href="#free-test">Start Typing Test <span aria-hidden="true">↓</span></a>
        <a class="btn btn-outline btn-lg" href="/exams/">Choose Your Exam</a>
      </div>
      <ul class="hero-points"><li>Real exam interface</li><li>Full &amp; half mistakes</li><li>Hindi without software</li></ul>
    </div>
    <div class="hero-visual">
      <canvas id="hero-kb" aria-hidden="true"></canvas>
      <div class="hero-screen" aria-hidden="true">
        <div class="hs-bar"><i></i><i></i><i></i><span>typingtestkaro.com/typing-test</span></div>
        <div class="hs-text"><span data-typed>Typing Test for Govt Exams</span><b class="caret"></b></div>
        <div class="hs-meta"><span>⚡ <b data-wpm>42</b> WPM</span><span>🎯 <b>98%</b> accuracy</span><span class="hs-live">● LIVE</span></div>
      </div>
      <span class="hero-badge b1">✓ Krutidev</span><span class="hero-badge b2">✓ Mangal Inscript</span><span class="hero-badge b3">🏆 Net WPM</span>
    </div>
  </div>
</section>

<section class="home-test-wrap" id="free-test" aria-labelledby="free-test-title"><div class="container">
  <div class="home-test-card">
    <div class="home-test-head">
      <div><h2 id="free-test-title">Free Online Typing Test</h2>
      <p>Just start typing — the 1-minute timer starts with your first key. Switch to <b>Hindi (Krutidev, Mangal Inscript, Remington GAIL)</b> or up to 15 minutes from the menu.</p></div>
      <div class="chips home-test-links"><a class="chip" href="/typing-test/5-minute/">5 min test</a><a class="chip" href="/typing-test/10-minute/">10 min test</a><a class="chip" href="/typing-test/hindi/">Hindi test</a></div>
    </div>
    ${testEmbed({ layout: "qwerty", duration: 60 })}
  </div>
  <div class="stats-strip home-stats">
    <div class="stat"><b data-count="${exams.length}">${exams.length}</b><span>Exam typing tests</span></div>
    <div class="stat"><b data-count="6">6</b><span>Keyboard layouts</span></div>
    <div class="stat"><b data-count="${totalLessons}">${totalLessons}</b><span>Course lessons</span></div>
    <div class="stat"><b data-count="${GAMES.length}">${GAMES.length}</b><span>Typing games</span></div>
  </div>
</div></section>

<section class="section">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Exam-wise typing tests</span><h2>Practise for the exam you are appearing in</h2>
      <p>Each exam test uses that exam's duration, speed standard and backspace rule, and tells you instantly whether you would qualify.</p></div>
    <div class="grid grid-4">${popular.map(examCard).join("")}</div>
    <div class="center mt-3"><a class="btn btn-outline" href="/exams/">View all ${exams.length} exams →</a></div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="section-head"><span class="eyebrow">हिंदी टाइपिंग टेस्ट</span><h2>Hindi Typing Test — Krutidev, Mangal Inscript &amp; Remington GAIL</h2>
      <p>Most state exams — UPSSSC, RSMSSB, Bihar and MP court exams — test Hindi typing at 25–30 WPM, while SSC and CPCT offer Mangal Inscript and Remington GAIL. Our Hindi typing test has all three layouts built in, so you can type Hindi on a normal English keyboard without installing Krutidev or Mangal fonts, and get Net WPM, accuracy and full/half mistakes counted the way exams count them.</p></div>
    <div class="grid grid-4">
      <a class="card" href="/typing-test/hindi-krutidev/"><div class="card-icon accent">क</div><h3>Krutidev Typing Test</h3><p>Krutidev 010 layout — the favourite for UP, Rajasthan, Bihar and MP exams.</p></a>
      <a class="card" href="/typing-test/hindi-mangal-inscript/"><div class="card-icon accent">अ</div><h3>Mangal Inscript Typing Test</h3><p>The Govt of India Unicode standard, offered in SSC and CPCT.</p></a>
      <a class="card" href="/typing-test/hindi-remington-gail/"><div class="card-icon accent">र</div><h3>Remington GAIL Typing Test</h3><p>Krutidev key positions with Unicode output, as in CBT exam software.</p></a>
      <a class="card" href="/typing-test/marathi/"><div class="card-icon accent">म</div><h3>Marathi Typing Test</h3><p>Marathi passages in Mangal Inscript and Remington layouts.</p></a>
    </div>
    <div class="chips mt-3" style="justify-content:center">
      <a class="chip" href="/courses/hindi-remington-gail/">Krutidev / Remington course</a><a class="chip" href="/courses/hindi-mangal-inscript/">Mangal Inscript course</a>
      <a class="chip" href="/keyboard-layouts/krutidev-remington-gail/">Krutidev keyboard chart</a><a class="chip" href="/tools/hindi-typing-online/">Hindi typing online</a>
      <a class="chip" href="/tools/krutidev-to-unicode/">Krutidev to Unicode</a><a class="chip" href="/blog/krutidev-vs-mangal-inscript/">Krutidev vs Mangal?</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Tests, practice modes &amp; tools</span><h2>Every kind of typing test, plus free tools</h2></div>
    <div class="tile-cols">
      <div><h3 class="tile-title">Typing tests</h3><div class="tile-grid">${TESTS.map((t) => tile(t.href, esc(t.name), esc(t.sub))).join("")}</div></div>
      <div><h3 class="tile-title">Practice &amp; tools</h3><div class="tile-grid">${TOOLS.filter((t) => t.href !== "/my-progress/").map((t) => tile(t.href, esc(t.name), esc(t.sub))).join("")}</div></div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Courses &amp; games</span><h2>Learn typing from zero to exam speed</h2><p>Free courses with a live keyboard that shows which finger to use — and games that make daily practice fun.</p></div>
    <div class="grid grid-3">
      ${courses.map((c) => `<a class="card" href="/courses/${c.slug}/"><div class="card-icon ${c.lang === "hi" ? "accent" : ""}">${c.lang === "hi" ? "क" : "A"}</div><h3>${esc(c.name)}</h3><p>${esc(c.tagline)}</p><div class="card-meta"><span class="badge badge-primary">${c.lessons.length} lessons</span><span class="badge">${esc(c.level)}</span></div></a>`).join("")}
    </div>
    <h3 class="tile-title mt-4">Typing games</h3>
    <div class="tile-grid tile-grid-5">${GAMES.map((g) => tile(`/games/${g.slug}/`, esc(g.name), esc(g.level), g.icon)).join("")}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Quick reference</span><h2>Typing speed required in government exams</h2><p>As per recent notifications. Always confirm with the latest official notification.</p></div>
    <div class="table-wrap speed-table"><table>
      <thead><tr><th>Exam</th><th>English</th><th>Hindi</th><th>Duration</th><th></th></tr></thead>
      <tbody>${exams.map((e) => `<tr><td><a href="/exams/${e.slug}/"><b>${esc(e.name)}</b></a></td><td>${e.kdph ? e.kdph.toLocaleString("en-IN") + " KDPH" : e.speed.en ? e.speed.en + " WPM" : "—"}</td><td>${e.speed.hi ? e.speed.hi + " WPM" : "—"}</td><td>${e.duration} min</td><td><a class="btn btn-sm btn-outline" href="/exams/${e.slug}/">Practice</a></td></tr>`).join("")}</tbody>
    </table></div>
    <p class="muted mt-2" style="font-size:.85rem">Figures for exams marked as "practice target" on their pages are recommended practice speeds; the recruiting body defines the exact standard in each notification.</p>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="section-head"><span class="eyebrow">From the blog</span><h2>Typing tips &amp; exam guides</h2></div>
    <div class="grid grid-3">${posts.slice(0, 3).map((p) => postCard(p)).join("")}</div>
    <div class="center mt-3"><a class="btn btn-outline" href="/blog/">Read all ${posts.length} articles →</a></div>
  </div>
</section>

${faqBlock(faqs)}`;

  // 3D hero: phrases with the physical keys that type them (English + Hindi Inscript)
  const UNSHIFT = { "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", "_": "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", "\"": "'", "<": ",", ">": ".", "?": "/" };
  const LEFT = "`12345qwertasdfgzxcvb";
  const keyStep = (k) => {
    if (k === " ") return ["Space"];
    const base = UNSHIFT[k] || k.toLowerCase();
    const shifted = !!UNSHIFT[k] || k !== k.toLowerCase();
    return shifted ? [base, LEFT.includes(base) ? "ShiftR" : "ShiftL"] : [base];
  };
  const heroPhrase = (text, lang) => {
    const steps = [];
    let upto = 0;
    for (const ch of text) {
      upto += ch.length;
      const k = lang === "en" ? ch : ch === " " ? " " : H.INSCRIPT_REVERSE[ch];
      if (k == null) throw new Error("hero: no key for " + ch);
      steps.push({ keys: keyStep(k), upto });
    }
    return { text, lang, steps };
  };
  const heroLabels = {};
  "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./".split("").forEach((k) => {
    const v = H.INSCRIPT[k];
    if (v && /[\u0900-\u097F]/.test(v)) heroLabels[k] = v;
  });
  const HERO = {
    labels: heroLabels,
    phrases: [
      heroPhrase("Typing Test for Govt Exams", "en"), heroPhrase("भारत एक विशाल देश है।", "hi"),
      heroPhrase("SSC CHSL: 35 WPM", "en"), heroPhrase("हिंदी टाइपिंग टेस्ट", "hi"), heroPhrase("Practice daily, improve fast.", "en")
    ]
  };

  const fxBody = body.replace(/class="card(?![-\w])/g, 'class="card fx-reveal').replace(/class="faq"/, 'class="faq fx-reveal-wrap"');
  emit({
    path: "/", priority: 1.0,
    head: `<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"}}</script>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<script>window.TE_HERO=${JSON.stringify(HERO)};</script>
<script type="module">
// The 3D keyboard is decoration: skip it where the hero visual is hidden (phones),
// on data-saver connections and without WebGL — the CSS keyboard shows instead.
const vis = document.querySelector(".hero-visual");
const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));
if (vis && getComputedStyle(vis).display !== "none") {
  if (window.WebGLRenderingContext && !saveData) {
    const go = () => import("/assets/js/hero3d.js?v=${global.BUILD_V}").catch(() => vis.classList.add("no-webgl"));
    document.readyState === "complete" ? go() : window.addEventListener("load", go);
  } else vis.classList.add("no-webgl");
}
</script>`,
    js: TEST_JS.concat(["/assets/js/home-fx.js"]),
    title: "Typing Test for Govt Exams — Free Hindi & English Typing Test | TypingTestKaro",
    description: "Free typing test for SSC, RRB, CPCT, High Court & state exams. Hindi typing test in Mangal Inscript, Krutidev & Remington GAIL, plus English.",
    keywords: "typing test, hindi typing test, english typing test, typing speed test, ssc typing test, cpct typing test, krutidev typing test, mangal typing test",
    body: fxBody, css: TEST_CSS.concat(["/assets/css/pages.css", "/assets/css/home.css"]),
    schema: [orgSchema, {
      "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url,
      potentialAction: { "@type": "SearchAction", target: SITE.url + "/exams/?q={search_term_string}", "query-input": "required name=search_term_string" }
    }, faqSchema(faqs)]
  });
})();

/* =====================================================================
   TYPING TEST PAGES
   ===================================================================== */
const TEST_PAGES = [
  {
    path: "/typing-test/", layout: "qwerty", duration: 60, priority: 0.95,
    h1: "Typing Test — Free Online Typing Speed Test",
    title: "Typing Test — Free Online Typing Speed Test (English & Hindi) | TypingTestKaro",
    description: "Take a free online typing test in English or Hindi. Check your typing speed in WPM with accuracy, net speed and mistakes. 1 to 15 minute tests with exam passages.",
    lead: "Check your typing speed in English or Hindi. Pick a layout and duration, then just start typing — the timer starts with your first key.",
    intro: `<h2>How this typing speed test works</h2>
<p>This online typing test measures how many words you can type per minute (WPM) and how accurately you type them. It uses real exam-style passages on polity, history, science, office work and legal topics — the kind of text you will see in the SSC, Railway and High Court skill tests — instead of random words.</p>
<ul class="list-check"><li><b>Choose your layout:</b> English QWERTY, Hindi Mangal Inscript, Krutidev 010 or Remington GAIL.</li><li><b>Choose the duration:</b> 1, 2, 3, 5, 10 or 15 minutes.</li><li><b>Type the passage</b> in the box. Correct words turn green and mistakes turn red (switch off Highlight for exam practice).</li><li><b>Get your result:</b> gross and net WPM, accuracy, KDPH, full and half mistakes, with a word-by-word comparison.</li></ul>
<h2>What is a good typing speed?</h2>
<p>Most government exams ask for 30–35 WPM in English and 25–30 WPM in Hindi. An average computer user types around 35–40 WPM; a trained typist types 50 WPM or more with 95%+ accuracy. Read our guide on <a href="/blog/average-typing-speed/">average typing speed</a> for details.</p>`,
    faqs: [
      { q: "How do I take the typing test?", a: "Select the language/layout and duration, click inside the typing box and start typing the passage. The timer starts automatically and the result appears when time is up or when you click Submit." },
      { q: "How is WPM calculated in this typing test?", a: "One word is counted as 5 key depressions including spaces. Gross WPM = key depressions ÷ 5 ÷ minutes. Net WPM = Gross WPM − mistakes ÷ minutes." },
      { q: "Can I take the typing test in Hindi?", a: "Yes. Select Hindi — Mangal Inscript, Krutidev 010 or Remington GAIL. You can type Hindi on a normal English keyboard because the layouts are built in." },
      { q: "Is backspace allowed?", a: "By default yes. Turn the Backspace switch off to practise for exams where corrections are not allowed." }
    ]
  },
  {
    path: "/typing-test/english/", layout: "qwerty", duration: 300, priority: 0.9,
    h1: "English Typing Test — Online Practice for Govt Exams",
    title: "English Typing Test Online — Free Practice for SSC, RRB, Court Exams",
    description: "Free English typing test online with exam-level passages. Practise for SSC CHSL (35 WPM), RRB NTPC (30 WPM) and court exams. Get net WPM, accuracy and mistakes.",
    lead: "Exam-level English passages with capitals and punctuation, scored the way skill tests are scored.",
    intro: `<h2>English typing test for government exams</h2>
<p>English typing is part of the skill test for SSC CHSL LDC/JSA (35 WPM), SSC DEST (8,000 KDPH), RRB NTPC typist posts (30 WPM), Supreme Court JCA and Delhi High Court JJA (35 WPM) and many state exams. This test uses exam-style passages with capital letters, commas, semicolons and official vocabulary so the practice matches the real exam.</p>
<p>Tip: once you cross your target speed with highlight on, switch <b>Highlight</b> off and practise with <b>Backspace</b> off for a few days — that is closest to exam pressure. New to typing? Start the free <a href="/courses/english-typing/">English typing course</a>.</p>`,
    faqs: [
      { q: "What English typing speed do I need for SSC CHSL?", a: "35 words per minute in English (about 10,500 key depressions per hour) in a 10-minute test." },
      { q: "Are capital letters and punctuation checked?", a: "Yes. A capitalisation or punctuation difference is counted as a half mistake; wrong, missing or extra words are full mistakes." },
      { q: "How long should I practise every day?", a: "30–45 minutes of focused practice daily — a short warm-up, two or three 10-minute tests and a review of your mistakes — gives steady improvement." }
    ]
  },
  {
    path: "/typing-test/hindi/", layout: "krutidev", duration: 300, priority: 0.95, lang: "hi",
    h1: "Hindi Typing Test — Krutidev, Mangal Inscript & Remington GAIL",
    title: "Hindi Typing Test Online — Krutidev, Mangal & Remington GAIL | TypingTestKaro",
    description: "Free Hindi typing test online in Krutidev 010, Mangal Inscript and Remington GAIL layouts. Type Hindi on any keyboard, get net WPM, accuracy and exam-wise results.",
    lead: "Type Hindi on your normal keyboard in the layout your exam uses — no font or software installation needed.",
    intro: `<h2>Which Hindi layout should you choose?</h2>
<div class="grid grid-3 mt-2 mb-3">
<a class="card" href="/typing-test/hindi-krutidev/"><h3>Krutidev 010</h3><p>Legacy font used with the typewriter (Remington) layout. Common in UP, Rajasthan, Bihar and MP state exams.</p></a>
<a class="card" href="/typing-test/hindi-mangal-inscript/"><h3>Mangal Inscript</h3><p>The Govt of India Unicode standard. Used by many central exams and offered in SSC and CPCT.</p></a>
<a class="card" href="/typing-test/hindi-remington-gail/"><h3>Remington GAIL</h3><p>Same key positions as Krutidev, typed in Unicode (Mangal font). Offered in SSC, CPCT and most CBT exams.</p></a>
</div>
<p>Hindi typing speed in exams is counted in key depressions: 5 key depressions = 1 word. Most exams ask for 25–30 WPM in Hindi. Read <a href="/blog/krutidev-vs-mangal-inscript/">Krutidev vs Mangal Inscript</a> to choose the right layout, or start a free <a href="/courses/hindi-remington-gail/">Remington</a> / <a href="/courses/hindi-mangal-inscript/">Inscript</a> course.</p>`,
    faqs: [
      { q: "Can I do Hindi typing without installing Krutidev font?", a: "Yes. The Krutidev/Remington and Inscript layouts are built into the test. Type on your English keyboard and the Hindi text appears in Unicode." },
      { q: "Is Krutidev and Remington GAIL the same?", a: "The key positions are the same. Krutidev 010 is a legacy (non-Unicode) font, while Remington GAIL produces Unicode text (Mangal font) with the same typewriter layout." },
      { q: "What Hindi typing speed is required?", a: "Typically 25 WPM for Railway, UP and state exams, 30 WPM for SSC CHSL, and 20 NWPM for CPCT — check your exam page for details." },
      { q: "How do I type 'ि' in Remington?", a: "Press F before the consonant: F then D types कि. For reph (र्) type the letter and then Shift+Z, e.g. dk;Z = कार्य." }
    ]
  },
  {
    path: "/typing-test/hindi-mangal-inscript/", layout: "inscript", duration: 300, priority: 0.9, lang: "hi",
    h1: "Mangal Inscript Hindi Typing Test",
    title: "Mangal Inscript Typing Test — Hindi Unicode Typing Practice Online",
    description: "Free Mangal Inscript Hindi typing test online. Practise Unicode Inscript keyboard for SSC, CPCT and central exams with net WPM, accuracy and mistake analysis.",
    lead: "Practise the Government of India's standard Unicode keyboard — built in, works on any English keyboard.",
    intro: `<h2>About the Inscript keyboard</h2>
<p>Inscript places vowels and matras on the left hand and consonants on the right hand, in the phonetic order of the Devanagari alphabet. The <kbd>D</kbd> key is the halant (्) used to make half letters and conjuncts: क + ् + ष = क्ष. <kbd>Shift</kbd>+<kbd>.</kbd> types the purna viram (।).</p>
<p>Switch on <b>Keyboard</b> above the test to see the full Inscript layout while you type. New to Inscript? Take the free <a href="/courses/hindi-mangal-inscript/">Mangal Inscript course</a>.</p>`,
    faqs: [
      { q: "Which exams use Mangal Inscript?", a: "SSC and CPCT offer Inscript for Hindi, and it is the standard for most central government offices. Many state exams also accept it." },
      { q: "How do I type half letters in Inscript?", a: "Type the consonant, then D (halant ्), then the next consonant. For example K + D + < gives क्ष." }
    ]
  },
  {
    path: "/typing-test/hindi-krutidev/", layout: "krutidev", duration: 300, priority: 0.9, lang: "hi",
    h1: "Krutidev Typing Test — Hindi Krutidev 010 Practice",
    title: "Krutidev Typing Test Online — Free Krutidev 010 Hindi Typing Test",
    description: "Free Krutidev typing test online. Practise Hindi typing in Krutidev 010 (Remington) layout for UP, Rajasthan, Bihar, MP and court exams without installing the font.",
    lead: "Krutidev 010 key positions, built in. Your text is shown in Unicode so it displays on every device.",
    intro: `<h2>Krutidev key tips</h2>
<ul class="list-check"><li><kbd>f</kbd> types the short i-matra (ि) — press it <b>before</b> the consonant: <code>fd</code> = कि.</li><li><kbd>Z</kbd> (Shift+z) types reph (र्) — press it <b>after</b> the letter: <code>/keZ</code> = धर्म.</li><li><kbd>A</kbd> (Shift+a) = ।, <kbd>]</kbd> = comma, <kbd>-</kbd> = full stop.</li><li>Many full letters are a half letter + <kbd>k</kbd>: <code>[k</code> = ख, <code>Fk</code> = थ, <code>/k</code> = ध.</li></ul>
<p>Learn it properly with the free <a href="/courses/hindi-remington-gail/">Remington GAIL / Krutidev course</a>, or convert old Krutidev text with our <a href="/tools/krutidev-to-unicode/">Krutidev to Unicode converter</a>.</p>`,
    faqs: [
      { q: "Do I need to install Krutidev font?", a: "No. The Krutidev keyboard is built into the test and the text is shown in Unicode Hindi, so it works on any computer or phone." },
      { q: "Which exams use Krutidev?", a: "It is widely used in UP (UPSSSC, UP Police), Rajasthan (RSMSSB, High Court), Bihar and MP exams. Always check the fonts offered in your notification." }
    ]
  },
  {
    path: "/typing-test/hindi-remington-gail/", layout: "remington", duration: 300, priority: 0.85, lang: "hi",
    h1: "Remington GAIL Hindi Typing Test",
    title: "Remington GAIL Typing Test — Hindi Typing Practice Online (Unicode)",
    description: "Free Remington GAIL Hindi typing test online. Practise the typewriter layout offered in SSC, CPCT and RRB exams with net WPM, accuracy and word-level mistakes.",
    lead: "The typewriter layout offered in SSC, CPCT and Railway exam software — with Unicode output.",
    intro: `<h2>Remington GAIL vs Krutidev</h2>
<p>Remington GAIL uses the same key positions as the Krutidev 010 font, but the exam software produces Unicode (Mangal) text. If you already know Krutidev, you already know Remington GAIL. Remington CBI is an older variant where several keys differ — read <a href="/blog/remington-gail-vs-remington-cbi/">Remington GAIL vs CBI</a>.</p>`,
    faqs: [
      { q: "Is Remington GAIL available in SSC exams?", a: "Yes. SSC's computer-based skill test offers Remington GAIL and Inscript for Hindi typing." },
      { q: "Can I switch between Remington and Inscript here?", a: "Yes, use the Language / Layout menu above the test. Your choice changes the keyboard instantly." }
    ]
  }
];
[1, 5, 10].forEach((m) => {
  TEST_PAGES.push({
    path: `/typing-test/${m}-minute/`, layout: "qwerty", duration: m * 60, priority: 0.8,
    h1: `${m} Minute Typing Test`,
    title: `${m} Minute Typing Test — Free ${m}-Min Typing Speed Test Online`,
    description: `Free ${m} minute typing test online in English or Hindi. ${m === 1 ? "Quickly check your typing speed" : m === 5 ? "Test your speed and stamina" : "Practise the full exam-length test"} with net WPM, accuracy and mistakes.`,
    lead: m === 1 ? "A quick 60-second check of your typing speed." : m === 5 ? "Five minutes is long enough to measure your real, sustained speed." : "Ten minutes — the same length as the SSC, RRB and most court typing tests.",
    intro: `<h2>Why take a ${m} minute typing test?</h2><p>${m === 1
      ? "A 1-minute test is great for a daily warm-up or a quick benchmark. Because it is short, your speed may be a little higher than in a long exam — use the 10-minute test to measure exam readiness."
      : m === 5 ? "Five minutes removes the lucky-sprint effect of a 1-minute test and shows the speed you can hold. It is ideal for daily practice."
        : "Most government typing tests last 10 minutes. Practising at full length builds the stamina and concentration you need to keep your speed and accuracy till the last minute."}</p>
<p>Want Hindi? Pick a Hindi layout from the menu above the test.</p>`,
    faqs: [{ q: `Is a ${m} minute typing test accurate?`, a: `Yes — the result uses the standard 5-keystrokes-per-word method. ${m < 10 ? "For exam readiness, also try the 10-minute test." : "It matches the length of most exam typing tests."}` }]
  });
});

if (HAS_MR) TEST_PAGES.push({
  path: "/typing-test/marathi/", layout: "mr_remington", duration: 300, priority: 0.85, lang: "mr",
  h1: "Marathi Typing Test — Mangal Inscript & Remington",
  title: "Marathi Typing Test Online — Free Mangal & Remington Marathi Typing",
  description: "Free Marathi typing test online in Mangal Inscript and Remington (Krutidev) layouts. Practise Marathi passages for Maharashtra govt exams with net WPM and accuracy.",
  lead: "मराठी टायपिंग टेस्ट — type Marathi on your normal keyboard in Inscript or Remington layout.",
  intro: `<h2>Marathi typing for Maharashtra exams</h2>
<p>Marathi uses the Devanagari script, so the same keyboards work: <b>Mangal Inscript</b> (Unicode standard) and <b>Remington / Krutidev</b> (typewriter layout). Marathi passages use the full stop (.) at the end of sentences. Letters like <b>ळ</b> are typed with <kbd>Shift</kbd>+<kbd>N</kbd> in Inscript and <kbd>Shift</kbd>+<kbd>G</kbd> in Remington.</p>
<p>New to Devanagari typing? The <a href="/courses/hindi-mangal-inscript/">Inscript</a> and <a href="/courses/hindi-remington-gail/">Remington</a> courses teach the same key positions.</p>`,
  faqs: [
    { q: "Can I type Marathi without installing a font?", a: "Yes. Choose Marathi — Mangal Inscript or Marathi — Remington from the layout menu and type on your English keyboard; the text appears in Unicode Marathi." },
    { q: "Which Marathi layout is used in exams?", a: "Maharashtra government typing exams commonly use Marathi Mangal (Inscript) or the Remington/ISM layout. Check your notification for the fonts offered." }
  ]
});
TEST_PAGES.push(
  {
    path: "/typing-test/daily-passage/", layout: "qwerty", duration: 600, source: "daily", priority: 0.8,
    h1: "Daily Typing Passage — Today's Practice Test",
    title: "Daily Typing Passage — New English & Hindi Typing Practice Every Day",
    description: "Practise a new typing passage every day in English, Hindi or Marathi. Build a daily typing habit with a 10-minute exam-style test and track your progress.",
    lead: "A new exam-style passage every day — the same passage for everyone, so you can compare with friends.",
    intro: `<h2>Build a daily typing habit</h2><p>The fastest way to improve is a short, focused session every day. This page picks a new passage at midnight. Take it once with highlight on to warm up, then once more with highlight off. Your results are saved on <a href="/my-progress/">My Progress</a>.</p>`,
    faqs: [{ q: "When does the daily passage change?", a: "Every day at midnight (your local date). Everyone typing on the same day gets the same passage." }]
  },
  {
    path: "/typing-test/custom-text/", layout: "qwerty", duration: 300, source: "custom", priority: 0.75,
    h1: "Custom Text Typing Test — Practise Your Own Passage",
    title: "Custom Text Typing Test — Type Your Own Passage Online Free",
    description: "Paste any text and take a typing test on it. Practise previous-year passages, notices or legal text in English, Hindi or Marathi with WPM, accuracy and mistakes.",
    lead: "Paste any passage — a previous-year exam text, a newspaper editorial or a court order — and practise on it.",
    intro: `<h2>How to use custom text</h2><ul class="list-check"><li>Choose your language/layout above the test.</li><li>Paste your text in the box and click <b>Use this text</b>.</li><li>Your text is saved in this browser, so it is ready next time.</li></ul><p>Tip: collect a few previous-year passages of your exam and practise them with highlight off. For Hindi, paste Unicode text — convert old Krutidev text first with the <a href="/tools/krutidev-to-unicode/">Krutidev to Unicode converter</a>.</p>`,
    faqs: [{ q: "Is my custom text uploaded?", a: "No. It stays in your browser's local storage on this device." }]
  },
  {
    path: "/typing-test/numeric-data-entry/", layout: "qwerty", duration: 300, source: "numeric", priority: 0.75,
    h1: "Numeric Data Entry Typing Test",
    title: "Numeric Typing Test — Number & Data Entry Speed Test (DEO, DEST)",
    description: "Free numeric data entry typing test: amounts, dates, codes and figures. Improve number-row and numpad speed for DEO, DEST and data entry operator exams.",
    lead: "Amounts, dates, invoice numbers and codes — practise the number keys used in data entry work.",
    intro: `<h2>Why practise numbers?</h2><p>Data entry and DEST passages often include figures, dates and amounts, and most typists slow down sharply on the number row. Practise here with the number row or your numeric keypad. Also try <b>Common words + punctuation &amp; numbers</b> from the Passage menu for mixed text.</p>`,
    faqs: [{ q: "Can I use the numeric keypad?", a: "Yes — both the number row and the numeric keypad work. In most exams the numeric keypad is allowed." }]
  }
);

TEST_PAGES.forEach((t) => {
  const body = pageHero({ title: esc(t.h1), lead: t.lead, crumbs: t.path === "/typing-test/" ? [{ name: "Typing Test" }] : [{ name: "Typing Test", href: "/typing-test/" }, { name: t.h1.split(" —")[0] }] }) +
    `<section class="section-sm"><div class="container">${testEmbed(Object.assign({ layout: t.layout, duration: t.duration }, t.source ? { source: t.source } : {}))}</div></section>
<section class="section-sm"><div class="container layout-sidebar"><article class="prose">${t.intro}</article>
<aside class="sidebar"><div class="card"><h3>Other typing tests</h3><div class="stack">${TESTS.filter((x) => x.href !== t.path).map((x) => `<a href="${x.href}">${esc(x.name)}</a>`).join("")}</div></div>
<div class="card"><h3>Practise by exam</h3><div class="chips">${exams.filter((e) => e.popular).map((e) => `<a class="chip" href="/exams/${e.slug}/">${esc(e.name)}</a>`).join("")}</div></div></aside></div></section>` +
    faqBlock(t.faqs);
  emit({
    path: t.path, priority: t.priority, title: t.title, description: t.description, body,
    css: TEST_CSS, js: TEST_JS,
    breadcrumbs: t.path === "/typing-test/" ? [{ name: "Typing Test" }] : [{ name: "Typing Test", href: "/typing-test/" }, { name: t.h1.split(" —")[0] }],
    schema: [faqSchema(t.faqs), {
      "@context": "https://schema.org", "@type": "WebApplication", name: t.h1, url: SITE.url + t.path,
      applicationCategory: "EducationalApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "INR" }
    }]
  });
});

/* =====================================================================
   EXAMS
   ===================================================================== */
(function examsHub() {
  const body = pageHero({
    title: "Exam-wise Typing Tests", crumbs: [{ name: "Exams" }],
    lead: `Free typing tests for ${exams.length} government exams with each exam's speed, duration and rules — in English and Hindi.`
  }) + `<section class="section-sm"><div class="container">
  <div class="exam-filter"><input class="input" type="search" id="exam-search" placeholder="Search exam — e.g. SSC, CPCT, High Court" aria-label="Search exams">
  <div class="chips" id="exam-cats"><button class="chip active" data-cat="all">All</button>${CATEGORIES.map((c) => `<button class="chip" data-cat="${c.id}">${esc(c.name)}</button>`).join("")}</div></div>
  ${CATEGORIES.map((c) => `<div class="exam-group" data-cat="${c.id}"><h2 class="mt-4">${esc(c.name)}</h2><div class="grid grid-4">${exams.filter((e) => e.category === c.id).map((e) => examCard(e).replace('class="card exam-card"', `class="card exam-card" data-name="${esc((e.name + " " + e.full + " " + e.posts).toLowerCase())}"`)).join("")}</div></div>`).join("")}
  <p class="muted mt-3" id="exam-empty" hidden>No exam found. Try the <a href="/typing-test/">general typing test</a>.</p>
  <div class="callout warn mt-4"><strong>Important</strong>Rules are summarised from recent official notifications. Speed standards, fonts and evaluation can change between notifications — always confirm with the latest notification of your exam.</div>
</div></section>` + ctaBand("Don't see your exam?", "Most typing tests ask for 30–35 WPM in English or 25–30 WPM in Hindi in 10 minutes. Practise with the general test.", "/typing-test/10-minute/", "Take 10-minute test");
  emit({
    path: "/exams/", priority: 0.9,
    title: "Exam-wise Typing Test — SSC, RRB, CPCT, High Court & State Exams",
    description: `Free exam-wise typing tests for ${exams.length} government exams: SSC CHSL, SSC CGL DEST, RRB NTPC, CPCT, High Court, UPSSSC, RSMSSB and more — Hindi & English.`,
    body, css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Exams" }],
    schema: [{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: exams.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}/exams/${e.slug}/`, name: e.full })) }]
  });
})();

exams.forEach((e) => {
  const langs = e.languages.map((l) => langName[l]).join(" & ");
  const speedRows = e.kdph
    ? `<tr><th>Speed required</th><td>${e.kdph.toLocaleString("en-IN")} key depressions per hour (≈${Math.round(e.kdph / 300)} WPM)</td></tr>`
    : Object.entries(e.speed).map(([l, w]) => `<tr><th>${langName[l]} speed</th><td>${w} WPM (${(w * 300).toLocaleString("en-IN")} key depressions/hour)${e.official ? "" : " — practice target"}</td></tr>`).join("");
  const faqs = [
    { q: `What is the typing speed required for ${e.name}?`, a: e.kdph ? `${e.name} requires ${e.kdph.toLocaleString("en-IN")} key depressions per hour — roughly ${Math.round(e.kdph / 300)} WPM — in a ${e.duration}-minute English test.` : `${Object.entries(e.speed).map(([l, w]) => `${langName[l]} ${w} WPM`).join(" or ")} in a ${e.duration}-minute test${e.official ? ", as per recent notifications" : " is a safe practice target; the exact standard is set in the notification"}.` },
    { q: `How long is the ${e.name} typing test?`, a: `The typing test is ${e.duration} minutes long${e.kdph ? "" : " for each language attempted"}. This practice test uses the same duration.` },
    { q: `In which languages can I give the ${e.name} typing test?`, a: `${langs}.${e.layouts.length ? ` Hindi layouts you can practise here: ${e.layoutNames.join(", ")}.` : ""}` },
    { q: `Is the ${e.name} typing test qualifying?`, a: "Typing skill tests are usually qualifying in nature — you must reach the minimum standard, but the marks are not added to the merit. Confirm this in your notification." },
    { q: `Can I use backspace in the ${e.name} typing test?`, a: "Backspace is generally available on computer-based typing tests, but editing tools and spell-check are not. Practise with backspace off sometimes to improve first-time accuracy." }
  ];
  const related = exams.filter((x) => x.category === e.category && x.slug !== e.slug).slice(0, 4);
  const relPosts = posts.filter((p) => p.category === "Exam Guides").slice(0, 3);
  const cfg = {
    name: e.name, languages: e.languages, layouts: e.layouts.length ? e.layouts : null, speed: e.speed, kdph: e.kdph || null,
    duration: e.duration, backspace: e.backspace, defaultLayout: e.defaultLayout, requirementText: e.requirementText
  };
  const body = pageHero({
    title: `${esc(e.name)} Typing Test ${new Date().getFullYear()} — Free Online Practice`, crumbs: [{ name: "Exams", href: "/exams/" }, { name: e.name }],
    lead: `Practise the ${esc(e.full)} in an exam-style interface — ${esc(e.requirementText)}.`,
    badges: [catName[e.category], langs, `${e.duration} minutes`, e.official ? "As per notification" : "Practice target"]
  }) + `<section class="section-sm"><div class="container">
  <script>window.TE_EXAM=${JSON.stringify(cfg)};</script>
  ${testEmbed({ mode: "exam", layout: e.defaultLayout, duration: e.duration * 60 })}
  <p class="muted center mt-2" style="font-size:.88rem">Want live word highlighting and other durations? Use the <a href="/typing-test/?time=${e.duration * 60}${e.languages[0] === "hi" ? "&lang=hi" : ""}">practice typing test</a>.</p>
</div></section>
<section class="section-sm"><div class="container layout-sidebar"><article class="prose">
  <h2>${esc(e.name)} typing test pattern</h2>
  <div class="table-wrap"><table><tbody>
    <tr><th>Exam</th><td>${esc(e.full)}</td></tr>
    <tr><th>Conducting body</th><td>${esc(e.body)}</td></tr>
    <tr><th>Posts</th><td>${esc(e.posts)}</td></tr>
    <tr><th>Mode</th><td>Computer-based typing test</td></tr>
    <tr><th>Language</th><td>${langs}</td></tr>
    ${speedRows}
    <tr><th>Duration</th><td>${e.duration} minutes</td></tr>
    ${e.layouts.length ? `<tr><th>Hindi layouts</th><td>${e.layoutNames.join(", ")}</td></tr>` : ""}
    <tr><th>Nature</th><td>Qualifying (confirm in notification)</td></tr>
  </tbody></table></div>
  <h2>Key points</h2>
  <ul>${e.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
  <h2>How your result is calculated here</h2>
  <p>This practice test counts <b>key depressions</b> (5 key depressions = 1 word). <b>Gross WPM</b> = key depressions ÷ 5 ÷ minutes, and <b>Net WPM</b> = Gross WPM − mistakes ÷ minutes. Wrong, missing and extra words are full mistakes; capitalisation and punctuation errors are half mistakes. ${e.kdph ? `For ${esc(e.name)} the result is compared with ${e.kdph.toLocaleString("en-IN")} key depressions per hour.` : `Your Net WPM is compared with the ${esc(e.name)} standard for the language you choose.`} The recruiting body's own evaluation method, published in the notification, is final.</p>
  <h2>Preparation tips for the ${esc(e.name)} typing test</h2>
  <ul>
    <li>Practise at full length (${e.duration} minutes) at least once a day so your speed doesn't drop in the last minutes.</li>
    <li>Aim for ${e.kdph ? "about 10,000 KDPH" : Object.entries(e.speed).map(([l, w]) => `${w + 8} WPM in ${langName[l]}`).join(" / ")} in practice — exam nerves usually cost a few WPM.</li>
    <li>Keep accuracy above 95%. Every mistake reduces your net speed.</li>
    <li>Switch highlighting off for your mock tests — the real exam doesn't colour your words.</li>
    ${e.languages.includes("hi") ? `<li>Practise the Hindi layout offered at your centre: ${e.layoutNames.join(" or ") || "Remington GAIL or Inscript"}. See <a href="/blog/krutidev-vs-mangal-inscript/">which layout to choose</a>.</li>` : ""}
    <li>Read our guide on <a href="/blog/how-to-increase-typing-speed/">how to increase typing speed</a>.</li>
  </ul>
  <div class="callout warn"><strong>Disclaimer</strong>${e.official ? "These details are summarised from recent official notifications." : "The speed shown is a recommended practice target; the recruiting body sets the exact typing standard in each notification."} Always confirm with the latest official notification of ${esc(e.body)}.</div>
</article>
<aside class="sidebar">
  <div class="card"><h3>Quick facts</h3><div class="stack">
    ${e.kdph ? `<div><span class="muted">Speed</span><br><b>${e.kdph.toLocaleString("en-IN")} KDPH</b></div>` : Object.entries(e.speed).map(([l, w]) => `<div><span class="muted">${langName[l]}</span><br><b>${w} WPM</b></div>`).join("")}
    <div><span class="muted">Duration</span><br><b>${e.duration} minutes</b></div></div></div>
  ${related.length ? `<div class="card"><h3>Related exams</h3><div class="stack">${related.map((r) => `<a href="/exams/${r.slug}/">${esc(r.name)} Typing Test</a>`).join("")}</div></div>` : ""}
  <div class="card"><h3>Exam guides</h3><div class="stack">${relPosts.map((p) => `<a href="/blog/${p.slug}/">${esc(p.title)}</a>`).join("")}</div></div>
</aside></div></section>` + faqBlock(faqs, `${esc(e.name)} typing test — FAQs`);
  emit({
    path: `/exams/${e.slug}/`, priority: e.popular ? 0.85 : 0.75,
    title: `${e.name} Typing Test ${new Date().getFullYear()} — Free Online Practice (${e.languages.map((l) => langName[l]).join(" & ")})`,
    description: `Free ${e.name} typing test online: ${e.requirementText}. Exam-style interface with net WPM, accuracy, mistakes and pass/fail result.`.slice(0, 160),
    keywords: `${e.name.toLowerCase()} typing test, ${e.name.toLowerCase()} typing speed, ${e.name.toLowerCase()} skill test`,
    body, css: TEST_CSS, js: TEST_JS,
    breadcrumbs: [{ name: "Exams", href: "/exams/" }, { name: e.name }],
    schema: [faqSchema(faqs)]
  });
});

/* =====================================================================
   COURSES
   ===================================================================== */
(function coursesHub() {
  const body = pageHero({ title: "Free Typing Courses", crumbs: [{ name: "Courses" }], lead: "Learn touch typing in English and Hindi — one key at a time, with an on-screen keyboard and finger guide." }) +
    `<section class="section"><div class="container"><div class="grid grid-3">
    ${courses.map((c) => `<a class="card" href="/courses/${c.slug}/"><div class="card-icon ${c.lang === "hi" ? "accent" : ""}">${c.lang === "hi" ? "क" : "A"}</div><h2 style="font-size:1.25rem">${esc(c.name)}</h2><p>${esc(c.description)}</p><div class="card-meta"><span class="badge badge-primary">${c.lessons.length} lessons</span><span class="badge">${esc(c.level)}</span></div></a>`).join("")}
    </div>
    <div class="grid grid-2 mt-4">
      <div class="card"><h3>How the courses work</h3><ul class="list-check"><li>Each lesson introduces a few new keys and mixes them with keys you already know.</li><li>The next key lights up on the keyboard with its finger colour.</li><li>You can't skip a wrong key — accuracy is built from day one.</li><li>Earn up to 3 stars per lesson; progress is saved on your device.</li></ul></div>
      <div class="card"><h3>Which course should I take?</h3><p>Take the <b>English course</b> first if you're new to typing. For Hindi, choose <b>Remington GAIL / Krutidev</b> for UP, Rajasthan, Bihar and most state exams, or <b>Mangal Inscript</b> for central exams — or read <a href="/blog/krutidev-vs-mangal-inscript/">Krutidev vs Mangal Inscript</a>.</p></div>
    </div></div></section>`;
  emit({
    path: "/courses/", priority: 0.85, title: "Free Typing Courses — Learn English & Hindi Typing Online",
    description: "Free online typing courses: English touch typing, Hindi Mangal Inscript and Remington GAIL/Krutidev. Step-by-step lessons with keyboard and finger guide.",
    body, css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Courses" }]
  });
})();

courses.forEach((c) => {
  const lessonPath = (i) => `/courses/${c.slug}/lesson-${i + 1}/`;
  const body = pageHero({ title: esc(c.name), crumbs: [{ name: "Courses", href: "/courses/" }, { name: c.name }], lead: esc(c.description), badges: [`${c.lessons.length} lessons`, c.level, "Free"] }) +
    `<section class="section"><div class="container layout-sidebar"><div>
    <div class="row mb-3"><a class="btn btn-primary" href="${lessonPath(0)}" data-continue="${c.slug}">Start lesson 1 →</a><span class="muted" data-course-progress="${c.slug}" data-total="${c.lessons.length}"></span></div>
    <div class="lesson-list">${c.lessons.map((l, i) => `<a class="lesson-row" href="${lessonPath(i)}" data-lesson="${c.slug}:${i + 1}"><span class="lesson-num">${i + 1}</span><div><h3${c.lang === "hi" ? ' lang="hi"' : ""}>${esc(l.title)}</h3><p>${esc(l.desc)}</p></div><span class="lesson-keys">${esc(l.keys)}</span><span class="lesson-stars"></span></a>`).join("")}</div>
    </div><aside class="sidebar"><div class="card"><h3>Keyboard layout</h3><div class="course-kb" data-kb-layout="${c.layout}"></div></div>
    <div class="card"><h3>After the course</h3><p>Move on to full-length tests to build exam speed.</p><a class="btn btn-outline btn-sm mt-2" href="${c.lang === "hi" ? `/typing-test/${c.layout === "inscript" ? "hindi-mangal-inscript" : "hindi-remington-gail"}/` : "/typing-test/english/"}">Take a typing test</a></div></aside></div></section>`;
  emit({
    path: `/courses/${c.slug}/`, priority: 0.8, title: `${c.name} — Free Online Lessons | TypingTestKaro`, description: c.description,
    body, css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/hindi.js", "/assets/js/typing.js"],
    breadcrumbs: [{ name: "Courses", href: "/courses/" }, { name: c.name }],
    schema: [{
      "@context": "https://schema.org", "@type": "Course", name: c.name, description: c.description,
      provider: { "@type": "Organization", name: SITE.name, sameAs: SITE.url }, isAccessibleForFree: true, inLanguage: c.lang === "hi" ? "hi" : "en",
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: "PT5H" }, offers: { "@type": "Offer", price: "0", priceCurrency: "INR", category: "Free" }
    }]
  });

  c.lessons.forEach((l, i) => {
    const data = { course: c.slug, lesson: i + 1, total: c.lessons.length, layout: c.layout, lang: c.lang, target: l.target, items: l.items,
      next: i + 1 < c.lessons.length ? lessonPath(i + 1) : null, back: `/courses/${c.slug}/` };
    const body = `<section class="section-sm"><div class="container">
  <nav class="breadcrumbs lesson-bc" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/courses/">Courses</a><span>/</span><a href="/courses/${c.slug}/">${esc(c.name)}</a><span>/</span>Lesson ${i + 1}</nav>
  <div class="lesson-head"><div><span class="eyebrow">Lesson ${i + 1} of ${c.lessons.length}</span><h1 ${c.lang === "hi" ? 'lang="hi"' : ""} style="font-size:clamp(1.4rem,3vw,2rem)">${esc(l.title)}</h1><p class="muted mb-0">${esc(l.desc)} Target: ${l.target} WPM.</p></div>
  <div class="row">${i > 0 ? `<a class="btn btn-outline btn-sm" href="${lessonPath(i - 1)}">← Previous</a>` : ""}${i + 1 < c.lessons.length ? `<a class="btn btn-outline btn-sm" href="${lessonPath(i + 1)}">Next →</a>` : ""}</div></div>
  <script>window.TE_LESSON=${JSON.stringify(data)};</script>
  <div id="lesson-player" class="mt-2"></div>
</div></section>`;
    emit({
      path: lessonPath(i), priority: 0.5,
      title: `Lesson ${i + 1}: ${l.title} — ${c.name}`.slice(0, 70),
      description: `${c.name} lesson ${i + 1}: ${l.desc} Free interactive typing lesson with keyboard and finger guide.`.slice(0, 160),
      body, css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/hindi.js", "/assets/js/typing.js", "/assets/js/lesson.js"],
      breadcrumbs: [{ name: "Courses", href: "/courses/" }, { name: c.name, href: `/courses/${c.slug}/` }, { name: `Lesson ${i + 1}` }]
    });
  });
});

/* =====================================================================
   GAMES
   ===================================================================== */
const GAME_INFO = {
  "typing-race": { title: "Typing Race Game — Race Cars with Your Typing Speed", how: ["Choose a bot difficulty and start the race.", "Type the sentence shown — every correct character moves your car.", "Finish first to win. Your WPM and accuracy are shown at the end."] },
  "word-rain": { title: "Word Rain — Falling Words Typing Game", how: ["Words fall from the top of the screen.", "Type a word and it disappears — no need to press Enter.", "Don't let words reach the ground: you have 5 lives. It gets faster each level."] },
  "balloon-pop": { title: "Balloon Pop — Typing Game for Beginners & Kids", how: ["Balloons with letters float up.", "Press the letter on a balloon to pop it before it flies away.", "Pop balloons in a row to build a combo multiplier. Try Home-row-only mode first."] },
  "word-blitz": { title: "Word Blitz — 60 Second Typing Speed Game", how: ["Pick 30, 60 or 120 seconds and a word difficulty.", "Type each word and press Space to move on.", "Your WPM and accuracy are calculated when time runs out."] },
  "keyboard-ninja": { title: "Keyboard Ninja — Learn Key Positions Game", how: ["A key lights up on the on-screen keyboard, coloured by finger.", "Press it as fast as you can with the correct finger.", "Start with home row mode, then move to all letters and numbers."] }
};
(function gamesHub() {
  const body = pageHero({ title: "Typing Games", crumbs: [{ name: "Games" }], lead: "Free typing games that build speed, accuracy and keyboard memory — for beginners, kids and exam aspirants." }) +
    `<section class="section"><div class="container"><div class="grid grid-3">${GAMES.map((g) => `<a class="card game-card" href="/games/${g.slug}/"><div class="game-emoji" aria-hidden="true">${g.icon}</div><h2 style="font-size:1.25rem">${esc(g.name)}</h2><p>${esc(g.short)}</p><div class="card-meta"><span class="badge">${esc(g.level)}</span><span class="badge badge-primary">Play free</span></div></a>`).join("")}</div>
    <div class="callout info mt-4"><strong>Do typing games really help?</strong>Yes — games build key memory and rhythm without the pressure of a test. Use them as a warm-up, then take a proper <a href="/typing-test/">typing test</a> to measure your exam speed.</div></div></section>`;
  emit({
    path: "/games/", priority: 0.8, title: "Typing Games — Free Online Games to Improve Typing Speed",
    description: "Play free typing games online: Typing Race, Word Rain, Balloon Pop, Word Blitz and Keyboard Ninja. Improve typing speed and accuracy while having fun.",
    body, css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Games" }]
  });
})();
GAMES.forEach((g) => {
  const info = GAME_INFO[g.slug];
  const body = pageHero({ title: esc(g.name), crumbs: [{ name: "Games", href: "/games/" }, { name: g.name }], lead: esc(g.short) }) +
    `<section class="section-sm"><div class="container"><div id="game-root" class="game-root" data-game="${g.slug}"></div></div></section>
<section class="section-sm"><div class="container grid grid-2">
  <div class="card"><h2 style="font-size:1.3rem">How to play</h2><ol>${info.how.map((h) => `<li>${esc(h)}</li>`).join("")}</ol></div>
  <div class="card"><h2 style="font-size:1.3rem">More games</h2><div class="stack">${GAMES.filter((x) => x.slug !== g.slug).map((x) => `<a href="/games/${x.slug}/">${x.icon} ${esc(x.name)} — <span class="muted">${esc(x.short)}</span></a>`).join("")}</div></div>
</div></section>`;
  emit({
    path: `/games/${g.slug}/`, priority: 0.7, title: info.title, description: `${g.short} Free online typing game to improve your typing speed and accuracy — no download needed.`,
    body, css: ["/assets/css/games.css", "/assets/css/pages.css"], js: ["/assets/js/games/words.js", `/assets/js/games/${g.slug}.js`],
    breadcrumbs: [{ name: "Games", href: "/games/" }, { name: g.name }]
  });
});

/* =====================================================================
   TOOLS
   ===================================================================== */
(function tools() {
  // Hindi typing online
  let faqs = [
    { q: "How can I type in Hindi online?", a: "Choose Remington GAIL/Krutidev or Mangal Inscript and type on your English keyboard. The Hindi text appears in Unicode, which you can copy and paste into Word, WhatsApp, Facebook or email." },
    { q: "Will the text work in MS Word and WhatsApp?", a: "Yes. The output is Unicode Hindi (the same as Mangal font), which works everywhere." },
    { q: "Is the text saved?", a: "Your text is kept only in your browser on this device so you don't lose it on refresh. Nothing is uploaded." }
  ];
  emit({
    path: "/tools/hindi-typing-online/", priority: 0.9,
    title: "Hindi Typing Online — Type in Hindi (Unicode) with Krutidev or Inscript",
    description: "Free Hindi typing online tool. Type Hindi on an English keyboard using Remington GAIL/Krutidev or Mangal Inscript layout and copy Unicode Hindi text anywhere.",
    body: pageHero({ title: "Hindi Typing Online", crumbs: [{ name: "Tools" }, { name: "Hindi Typing Online" }], lead: "Type Hindi on your English keyboard and copy the Unicode text into Word, WhatsApp, email or any website." }) +
      `<section class="section-sm"><div class="container"><div class="card tool-card" id="hindi-pad">
      <div class="row mb-2"><label class="tt-field" style="max-width:320px"><span>Keyboard layout</span><select class="input" id="hp-layout"><option value="remington">Remington GAIL / Krutidev</option><option value="inscript">Mangal Inscript</option></select></label>
      <div class="row" style="margin-left:auto"><button class="btn btn-primary btn-sm" id="hp-copy" type="button">Copy text</button><button class="btn btn-outline btn-sm" id="hp-download" type="button">Download .txt</button><button class="btn btn-outline btn-sm" id="hp-clear" type="button">Clear</button></div></div>
      <textarea class="input tool-area hi" id="hp-text" lang="hi" rows="9" placeholder="यहाँ हिंदी टाइप करें…" spellcheck="false"></textarea>
      <p class="muted mt-2" style="font-size:.85rem"><span id="hp-count">0 words · 0 characters</span> · Backspace deletes the last key. Click a key below to type it.</p>
      <div id="hp-kb" class="mt-2"></div></div></div></section>
      <section class="section-sm"><div class="container prose" style="max-width:860px"><h2>How to type in Hindi on an English keyboard</h2><p>Select a layout and start typing in the box. With <b>Remington GAIL / Krutidev</b>, press <kbd>f</kbd> before a consonant for ि and <kbd>Z</kbd> after a syllable for reph (र्). With <b>Mangal Inscript</b>, vowels are on the left, consonants on the right and <kbd>d</kbd> is the halant. Want to type faster? Take the <a href="/courses/hindi-remington-gail/">Remington</a> or <a href="/courses/hindi-mangal-inscript/">Inscript</a> course, then a <a href="/typing-test/hindi/">Hindi typing test</a>.</p></div></section>` + faqBlock(faqs),
    css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/hindi.js", "/assets/js/typing.js", "/assets/js/tools.js"],
    breadcrumbs: [{ name: "Tools" }, { name: "Hindi Typing Online" }], schema: [faqSchema(faqs)]
  });

  faqs = [
    { q: "What does this converter do?", a: "It converts text typed in the legacy Krutidev 010 font into Unicode Hindi (Mangal), which displays correctly on all devices and websites." },
    { q: "Why does my Krutidev text look like English letters?", a: "Krutidev is a non-Unicode font: it stores English characters and only looks Hindi when the Krutidev font is applied. Converting it to Unicode fixes this permanently." },
    { q: "Is my text uploaded anywhere?", a: "No. The conversion runs entirely in your browser." }
  ];
  emit({
    path: "/tools/krutidev-to-unicode/", priority: 0.8,
    title: "Krutidev to Unicode Converter — Convert Krutidev 010 to Mangal Online",
    description: "Free Krutidev to Unicode converter. Convert Krutidev 010 Hindi text to Unicode (Mangal) instantly in your browser — works with Word, WhatsApp and websites.",
    body: pageHero({ title: "Krutidev to Unicode Converter", crumbs: [{ name: "Tools" }, { name: "Krutidev to Unicode" }], lead: "Paste Krutidev 010 text and get Unicode Hindi instantly. Everything runs in your browser." }) +
      `<section class="section-sm"><div class="container"><div class="grid grid-2">
      <div class="card"><label class="field"><span><b>Krutidev text</b></span><textarea class="input tool-area" id="kd-in" rows="10" placeholder="Hkkjr ,d fo'kky ns'k gSA" spellcheck="false"></textarea></label><div class="row"><button class="btn btn-primary" id="kd-go" type="button">Convert to Unicode</button><button class="btn btn-outline" id="kd-sample" type="button">Try sample</button></div></div>
      <div class="card"><label class="field"><span><b>Unicode Hindi (Mangal)</b></span><textarea class="input tool-area hi" id="kd-out" lang="hi" rows="10" readonly></textarea></label><div class="row"><button class="btn btn-outline" id="kd-copy" type="button">Copy Unicode text</button></div></div>
      </div></div></section>` + faqBlock(faqs),
    css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/hindi.js", "/assets/js/tools.js"],
    breadcrumbs: [{ name: "Tools" }, { name: "Krutidev to Unicode" }], schema: [faqSchema(faqs)]
  });

  faqs = [
    { q: "How do I calculate typing speed?", a: "Divide the total key depressions (characters including spaces) by 5 to get words, then divide by the minutes taken. That is your gross WPM." },
    { q: "What is net WPM?", a: "Net WPM = Gross WPM − (uncorrected mistakes ÷ minutes). It is the speed most exams use to decide if you qualify." },
    { q: "What is KDPH?", a: "Key Depressions Per Hour. SSC DEST requires 8,000 KDPH. KDPH = key depressions × 60 ÷ minutes." }
  ];
  emit({
    path: "/tools/typing-speed-calculator/", priority: 0.75,
    title: "Typing Speed Calculator — Gross WPM, Net WPM, KDPH & Accuracy",
    description: "Free typing speed calculator: enter key depressions, time and mistakes to get gross WPM, net WPM, KDPH, accuracy and error percentage as used in govt exams.",
    body: pageHero({ title: "Typing Speed Calculator", crumbs: [{ name: "Tools" }, { name: "Typing Speed Calculator" }], lead: "Work out gross WPM, net WPM, KDPH and error percentage from your numbers." }) +
      `<section class="section-sm"><div class="container"><div class="grid grid-2">
      <form class="card" id="calc" onsubmit="return false">
        <div class="field"><label for="c-keys">Total key depressions (characters incl. spaces)</label><input class="input" id="c-keys" type="number" min="0" value="1750"></div>
        <div class="field"><label for="c-min">Time taken (minutes)</label><input class="input" id="c-min" type="number" min="0.1" step="0.1" value="10"></div>
        <div class="field"><label for="c-full">Full mistakes</label><input class="input" id="c-full" type="number" min="0" value="6"></div>
        <div class="field"><label for="c-half">Half mistakes</label><input class="input" id="c-half" type="number" min="0" value="4"></div>
      </form>
      <div class="card"><h2 style="font-size:1.25rem">Result</h2><div class="tt-result-grid" id="calc-out"></div>
      <p class="muted mt-2" style="font-size:.85rem">Words = key depressions ÷ 5. Error % = (full + half ÷ 2) ÷ words × 100.</p></div>
      </div></div></section>` + faqBlock(faqs),
    css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/tools.js"],
    breadcrumbs: [{ name: "Tools" }, { name: "Typing Speed Calculator" }], schema: [faqSchema(faqs)]
  });

  emit({
    path: "/my-progress/", priority: 0.3, noindex: true, title: "My Typing Progress — TypingTestKaro",
    description: "Your saved typing test results and speed progress on this device.",
    body: pageHero({ title: "My Progress", crumbs: [{ name: "My Progress" }], lead: "Your typing test results, saved privately in this browser." }) +
      `<section class="section-sm"><div class="container" id="progress-root"></div></section>`,
    css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/tools.js"]
  });
})();

/* =====================================================================
   BLOG
   ===================================================================== */
(function blog() {
  const cats = Object.keys(CAT_META).filter((c) => posts.some((p) => p.category === c))
    .concat([...new Set(posts.map((p) => p.category))].filter((c) => !CAT_META[c]));
  const count = (c) => posts.filter((p) => p.category === c).length;
  const catNav = (current) => `<nav class="blog-nav" aria-label="Blog categories">
    <a class="chip${current === "all" ? " active" : ""}" href="/blog/">All articles <span class="chip-count">${posts.length}</span></a>
    ${cats.map((c) => `<a class="chip${current === c ? " active" : ""}" href="/blog/category/${catMeta(c).slug}/">${esc(c)} <span class="chip-count">${count(c)}</span></a>`).join("")}
    <a class="chip chip-archive${current === "archive" ? " active" : ""}" href="/blog/archive/">🗂 Archive</a></nav>`;
  const blogSchema = (url, name, list) => ({
    "@context": "https://schema.org", "@type": "CollectionPage", name, url: SITE.url + url,
    mainEntity: { "@type": "ItemList", itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}/blog/${p.slug}/`, name: p.title })) }
  });

  // Blog home: featured latest post + grid
  const [latest, ...rest] = posts;
  emit({
    path: "/blog/", priority: 0.8, title: "Typing Blog — Typing Tips, Exam Guides & Hindi Typing | TypingTestKaro",
    description: "Typing tips, government exam typing test guides (SSC, RRB, CPCT, High Court) and Hindi typing tutorials for Krutidev, Mangal Inscript and Remington.",
    body: pageHero({ title: "Typing Blog — Tips, Exam Guides &amp; Hindi Typing", crumbs: [{ name: "Blog" }], lead: "Practical advice on speed-building, exam typing test rules and Hindi keyboard layouts — written by " + esc(AUTHOR.name) + "." }) +
      `<section class="section-sm"><div class="container">${catNav("all")}
      <div class="mt-3">${postCard(latest, true)}</div>
      <div class="grid grid-3 mt-3">${rest.map((p) => postCard(p)).join("")}</div>
      <div class="archive-cta mt-4"><div><h2>Looking for an older article?</h2><p class="muted mb-0">Browse every post by month and category, or search the archive.</p></div><a class="btn btn-primary" href="/blog/archive/">Open the blog archive →</a></div>
      </div></section>`,
    css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Blog" }],
    schema: [{ "@context": "https://schema.org", "@type": "Blog", name: `${SITE.name} Blog`, url: SITE.url + "/blog/", author: personRef,
      blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE.url}/blog/${p.slug}/`, datePublished: p.date })) }]
  });

  // Archive: grouped by month, searchable, with category + month sidebar
  const months = [...new Set(posts.map((p) => monthKey(p.date)))];
  const archiveItem = (p) => {
    const d = new Date(p.date + "T00:00:00"), m = catMeta(p.category);
    return `<li class="arch-item" data-text="${esc((p.title + " " + p.excerpt + " " + p.category + " " + p.keywords).toLowerCase())}">
      <a href="/blog/${p.slug}/"><span class="arch-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-IN", { month: "short" })}</small></span>
      <span class="arch-main"><span class="arch-title">${esc(p.title)}</span><span class="arch-excerpt">${esc(p.excerpt)}</span>
      <span class="arch-meta"><span class="arch-cat cat-${m.slug}">${esc(p.category)}</span><span>${esc(p.readTime)} read</span></span></span>
      <span class="arch-arrow" aria-hidden="true">→</span></a></li>`;
  };
  emit({
    path: "/blog/archive/", priority: 0.6, title: "Blog Archive — All Typing Articles by Month & Category | TypingTestKaro",
    description: `All ${posts.length} TypingTestKaro articles in one place — typing tips, SSC/RRB/CPCT exam guides and Hindi typing tutorials, organised by month and category.`,
    body: pageHero({ title: "Blog Archive", crumbs: [{ name: "Blog", href: "/blog/" }, { name: "Archive" }], lead: `Every article we've published — ${posts.length} posts across ${cats.length} topics. Search, or browse by month and category.` }) +
      `<section class="section-sm"><div class="container">${catNav("archive")}
      <div class="layout-sidebar mt-3">
        <div>
          <div class="arch-search"><input class="input" type="search" id="archive-search" placeholder="Search articles — e.g. SSC, Krutidev, WPM" aria-label="Search the blog archive"><span class="muted" id="archive-count">${posts.length} articles</span></div>
          ${months.map((k) => { const list = posts.filter((p) => monthKey(p.date) === k); return `<section class="arch-month" id="m-${k}"><h2>${fmtMonth(k)} <span class="chip-count">${list.length}</span></h2><ol class="arch-list">${list.map(archiveItem).join("")}</ol></section>`; }).join("")}
          <p class="muted" id="archive-empty" hidden>No articles match your search. Try another word, or <a href="/blog/">browse all articles</a>.</p>
        </div>
        <aside class="sidebar">
          <div class="card"><h3>Categories</h3><ul class="arch-side">${cats.map((c) => `<li><a href="/blog/category/${catMeta(c).slug}/"><span>${catMeta(c).glyph} ${esc(c)}</span><span class="chip-count">${count(c)}</span></a></li>`).join("")}</ul></div>
          <div class="card"><h3>By month</h3><ul class="arch-side">${months.map((k) => `<li><a href="#m-${k}"><span>${fmtMonth(k)}</span><span class="chip-count">${posts.filter((p) => monthKey(p.date) === k).length}</span></a></li>`).join("")}</ul></div>
        </aside>
      </div></div></section>`,
    css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Blog", href: "/blog/" }, { name: "Archive" }],
    schema: [blogSchema("/blog/archive/", `${SITE.name} Blog Archive`, posts)]
  });

  // One page per category
  cats.forEach((c) => {
    const m = catMeta(c), list = posts.filter((p) => p.category === c);
    emit({
      path: `/blog/category/${m.slug}/`, priority: 0.6, title: `${c} — Typing Articles & Guides | TypingTestKaro Blog`,
      description: (m.desc || `Articles about ${c}.`).slice(0, 158),
      body: pageHero({ title: `${m.glyph} ${esc(c)}`, crumbs: [{ name: "Blog", href: "/blog/" }, { name: c }], lead: esc(m.desc), badges: [`${list.length} article${list.length === 1 ? "" : "s"}`] }) +
        `<section class="section-sm"><div class="container">${catNav(c)}
        <div class="grid grid-3 mt-3">${list.map((p) => postCard(p)).join("")}</div>
        <div class="archive-cta mt-4"><div><h2>More topics</h2><p class="muted mb-0">See every article by month in the archive.</p></div><a class="btn btn-outline" href="/blog/archive/">Blog archive →</a></div>
        </div></section>`,
      css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Blog", href: "/blog/" }, { name: c }],
      schema: [blogSchema(`/blog/category/${m.slug}/`, `${c} — ${SITE.name} Blog`, list)]
    });
  });

  posts.forEach((p) => {
    const related = posts.filter((x) => x.slug !== p.slug && x.category === p.category).concat(posts.filter((x) => x.slug !== p.slug && x.category !== p.category)).slice(0, 3);
    const body = `<section class="page-hero">${PH_DECO}<div class="container" style="max-width:900px">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog/">Blog</a><span>/</span><a href="/blog/category/${catMeta(p.category).slug}/">${esc(p.category)}</a></nav>
  <h1>${esc(p.title)}</h1><p>${esc(p.excerpt)}</p>
  <div class="chips mt-2"><a class="badge" href="/blog/category/${catMeta(p.category).slug}/">${esc(p.category)}</a><span class="badge">Updated ${fmtDate(p.date)}</span><span class="badge">${esc(p.readTime)} read</span><a class="badge byline" href="${AUTHOR.path}">By ${esc(AUTHOR.name)}</a></div></div></section>
<section class="section-sm"><div class="container layout-sidebar">
  <div><article class="prose">${p.html}</article>${authorBox()}</div>
  <aside class="sidebar">
    ${p.toc.length > 2 ? `<nav class="card toc" aria-label="Table of contents"><h3>In this article</h3><ol>${p.toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join("")}</ol></nav>` : ""}
    <div class="card"><h3>Test your speed</h3><p>Put these tips into practice with a free typing test.</p><div class="stack mt-2"><a class="btn btn-primary btn-sm" href="/typing-test/">English / Hindi typing test</a><a class="btn btn-outline btn-sm" href="/exams/">Exam-wise tests</a></div></div>
  </aside></div></section>
<section class="section-sm"><div class="container"><div class="row" style="justify-content:space-between"><h2 class="mb-0">Related articles</h2><a class="btn btn-outline btn-sm" href="/blog/archive/">Blog archive →</a></div><div class="grid grid-3 mt-3">${related.map((x) => postCard(x)).join("")}</div></div></section>`;
    emit({
      path: `/blog/${p.slug}/`, priority: 0.7, title: p.title + " | TypingTestKaro", description: p.description, keywords: p.keywords, ogType: "article",
      body, css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Blog", href: "/blog/" }, { name: p.title }],
      schema: [{
        "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description,
        datePublished: p.date, dateModified: p.date, author: personRef,
        publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: SITE.url + "/favicon.svg" } },
        mainEntityOfPage: `${SITE.url}/blog/${p.slug}/`, keywords: p.keywords, wordCount: p.words
      }].concat(p.faqs.length ? [faqSchema(p.faqs)] : [])
    });
  });
})();

/* =====================================================================
   AUTHOR PAGE
   ===================================================================== */
emit({
  path: AUTHOR.path, priority: 0.5,
  title: `${AUTHOR.name} — Founder of TypingTestKaro | Author Profile`,
  description: `${AUTHOR.name}, founder of TypingTestKaro, with experience at DRDO ITR and CSIR-CEERI Pilani. Articles on typing tests, Hindi typing and government exam preparation.`,
  body: `<section class="page-hero">${PH_DECO}<div class="container">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/about/">About</a><span>/</span>${esc(AUTHOR.name)}</nav>
  <div class="author-hero"><span class="author-avatar lg" aria-hidden="true">${AUTHOR.initials}</span>
  <div><h1>${esc(AUTHOR.name)}</h1><p>${esc(AUTHOR.role)}</p>
  <div class="chips mt-2">${AUTHOR.experience.map((e) => `<span class="badge">${esc(e.org)}</span>`).join("")}</div></div></div></div></section>
<section class="section-sm"><div class="container layout-sidebar">
  <article class="prose"><h2>About ${esc(AUTHOR.name)}</h2><p>${esc(AUTHOR.bio)}</p>
  <h2>Experience</h2><ul>${AUTHOR.experience.map((e) => `<li><b>${esc(e.org)}</b> — ${esc(e.note)}</li>`).join("")}<li><b>Founder, TypingTestKaro</b> — free typing tests, courses and tools for Indian government exam aspirants</li><li><b>Business owner</b> — currently running a business</li></ul>
  <h2>Articles by ${esc(AUTHOR.name)}</h2></article>
  <aside class="sidebar"><div class="card"><h3>Editorial approach</h3><p>Exam rules are summarised from official notifications and clearly labelled when a figure is only a practice target. Found something outdated? <a href="/contact/">Let us know</a>.</p></div></aside></div>
  <div class="container"><div class="grid grid-3 mt-2">${posts.map((p) => postCard(p)).join("")}</div></div></section>`,
  css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "About", href: "/about/" }, { name: AUTHOR.name }],
  schema: [{ "@context": "https://schema.org", "@type": "ProfilePage", url: SITE.url + AUTHOR.path,
    mainEntity: Object.assign({}, personRef, { description: AUTHOR.bio, worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url } }) }]
});

/* =====================================================================
   STATIC PAGES
   ===================================================================== */
function simplePage(pathName, title, h1, description, html, opts = {}) {
  emit(Object.assign({
    path: pathName, priority: 0.4, title, description,
    body: pageHero({ title: h1, crumbs: [{ name: h1 }] }) + `<section class="section"><div class="container prose" style="max-width:860px">${html}</div></section>`,
    css: ["/assets/css/pages.css"], breadcrumbs: [{ name: h1 }]
  }, opts));
}
simplePage("/about/", "About TypingTestKaro — Free Typing Practice for Govt Exams", "About Us",
  "TypingTestKaro is a free typing practice platform for Indian government exam aspirants — English and Hindi typing tests, courses and games.",
  `<p><b>TypingTestKaro</b> helps government job aspirants clear the typing skill test. Lakhs of candidates qualify the written exam every year and then lose the job at the typing test — usually not because they can't type, but because they never practised on the right layout, at the right length, with the right scoring.</p>
<h2>What we offer</h2><ul><li><b>Exam-wise typing tests</b> for ${exams.length} exams with each exam's duration, speed standard and a qualified / not-qualified result.</li><li><b>Hindi typing without installation</b> — Mangal Inscript, Krutidev 010 and Remington GAIL layouts work in any browser.</li><li><b>Free structured courses</b> in English, Inscript and Remington with an on-screen keyboard and finger guide.</li><li><b>Typing games</b>, tools and in-depth exam guides on our blog.</li></ul>
<h2>Our principles</h2><ul><li><b>Free for everyone.</b> Core practice will always be free and require no signup.</li><li><b>Accuracy of information.</b> Exam rules are summarised from official notifications, clearly marked where a figure is a practice target, and reviewed when new notifications are released.</li><li><b>Privacy.</b> Your results are stored on your own device, not on our servers.</li></ul>
<h2>Who is behind TypingTestKaro</h2>
<div class="not-prose">${authorBox().replace("Written by", "Founder")}</div>
<p>Questions or suggestions? <a href="/contact/">Contact us</a> — we read every message.</p>`, { schema: [orgSchema] });
simplePage("/contact/", "Contact Us — TypingTestKaro", "Contact Us", "Contact the TypingTestKaro team for feedback, exam updates, corrections or partnership enquiries.",
  `<p>We'd love to hear from you — whether you found an error in an exam rule, want a new exam added, or have feedback about the tests.</p>
<div class="grid grid-2 not-prose"><div class="card"><h3>Email</h3><p><a href="mailto:${SITE.email}">${SITE.email}</a></p><p>We usually reply within 2 working days.</p></div>
<div class="card"><h3>Report an exam update</h3><p>Send the link to the official notification and we'll update the exam page.</p></div></div>
<h2>Send a message</h2>
<form class="card contact-form" action="mailto:${SITE.email}" method="post" enctype="text/plain">
<div class="field"><label for="cf-name">Name</label><input class="input" id="cf-name" name="name" required></div>
<div class="field"><label for="cf-email">Email</label><input class="input" id="cf-email" type="email" name="email" required></div>
<div class="field"><label for="cf-msg">Message</label><textarea class="input" id="cf-msg" name="message" rows="5" required></textarea></div>
<button class="btn btn-primary" type="submit">Send message</button></form>`);
simplePage("/privacy-policy/", "Privacy Policy — TypingTestKaro", "Privacy Policy", "How TypingTestKaro handles your data: results are stored locally in your browser; no account required.",
  `<p><i>Last updated: ${fmtDate("2026-09-24")}</i></p>
<h2>Information we collect</h2><p>TypingTestKaro does not require an account. Your typing results, course progress, game scores and preferences (such as dark mode and font size) are stored in your browser's local storage on your own device. They are not sent to our servers.</p>
<h2>Text you type</h2><p>Text typed in the typing tests and tools is processed only in your browser. The Hindi typing tool keeps a draft in your browser so you don't lose it on refresh.</p>
<h2>Cookies and analytics</h2><p>We may use privacy-friendly analytics and, in future, advertising to keep the site free. If we do, this policy will be updated and any required consent will be requested.</p>
<h2>Third-party services</h2><p>Fonts are loaded from Google Fonts, which may log your IP address as part of normal web requests.</p>
<h2>Clearing your data</h2><p>You can clear all saved results at any time from <a href="/my-progress/">My Progress</a> or by clearing your browser's site data.</p>
<h2>Contact</h2><p>Questions about privacy: <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>`);
simplePage("/terms/", "Terms of Use — TypingTestKaro", "Terms of Use", "Terms of use for TypingTestKaro typing tests, courses, games and tools.",
  `<p>By using TypingTestKaro you agree to these terms.</p><h2>Use of the service</h2><p>The site is provided free for personal practice. Do not attempt to disrupt the service, scrape it at scale or republish its passages, lessons or articles without permission.</p>
<h2>No guarantee</h2><p>Practice results are indicative. Actual exam evaluation is done by the recruiting body using its own software and rules. We do not guarantee selection in any exam.</p>
<h2>Content</h2><p>Passages, lessons and articles are original content of TypingTestKaro unless stated otherwise. The Krutidev conversion table is adapted from an MIT-licensed open-source project.</p>
<h2>Changes</h2><p>We may update these terms; the latest version is always on this page.</p>`);
simplePage("/disclaimer/", "Disclaimer — TypingTestKaro", "Disclaimer", "TypingTestKaro is not affiliated with SSC, RRB, any High Court or any recruiting body.",
  `<p>TypingTestKaro is an independent practice platform. It is <b>not affiliated with, endorsed by or connected to</b> the Staff Selection Commission, Railway Recruitment Boards, any High Court, the Supreme Court, MAP_IT/CPCT, or any state recruitment body.</p>
<p>Exam names are used only to describe which exam a practice test is designed for. Exam rules shown on this site are summarised from publicly available notifications and may change. Figures marked "practice target" are our recommendations, not official standards. Always refer to the latest official notification.</p>`);

emit({
  path: "/404.html", noindex: true, title: "Page not found — TypingTestKaro", description: "The page you were looking for could not be found.",
  body: `<section class="section"><div class="container center" style="max-width:640px"><div class="stat"><b style="font-size:5rem">404</b></div><h1 style="font-size:2rem">This page took a typo</h1><p class="muted">The page you're looking for doesn't exist or has moved.</p>
  <div class="row" style="justify-content:center"><a class="btn btn-primary" href="/">Go home</a><a class="btn btn-outline" href="/typing-test/">Take a typing test</a><a class="btn btn-outline" href="/exams/">Browse exams</a></div></div></section>`,
  css: ["/assets/css/pages.css"]
});

/* =====================================================================
   V2 PAGES: dictation, weak keys, charts, quiz, shortcuts, converters, offline
   ===================================================================== */
(function morePages() {
  // ---- Dictation test
  let faqs = [
    { q: "What is a dictation typing test?", a: "The passage is read aloud and you type what you hear, like a transcription test. It trains listening accuracy along with typing speed." },
    { q: "Which browsers support dictation?", a: "It uses your browser's built-in text-to-speech. Chrome and Edge on a computer work best; Hindi voices depend on your device." },
    { q: "Is this the same as a steno test?", a: "No — steno tests need shorthand. This is a transcription practice: good for listening skills and for DEO/typist roles that involve typing from audio." }
  ];
  emit({
    path: "/typing-test/dictation/", priority: 0.75,
    title: "Dictation Typing Test — Listen & Type (English & Hindi Audio)",
    description: "Free dictation typing test: listen to a passage read aloud at 40–100 words per minute and type it. English and Hindi audio with word-by-word error check.",
    body: pageHero({ title: "Dictation Typing Test", crumbs: [{ name: "Typing Test", href: "/typing-test/" }, { name: "Dictation" }], lead: "Listen to the passage and type what you hear. Choose the dictation speed, then check your transcript word by word." }) +
      `<section class="section-sm"><div class="container"><div id="dictation"></div></div></section>` + faqBlock(faqs),
    css: TEST_CSS, js: TEST_JS.concat(["/assets/js/dictation.js"]),
    breadcrumbs: [{ name: "Typing Test", href: "/typing-test/" }, { name: "Dictation" }], schema: [faqSchema(faqs)]
  });

  // ---- Weak keys practice
  emit({
    path: "/practice/weak-keys/", priority: 0.6,
    title: "Weak Key Practice — Personal Typing Drill From Your Mistakes",
    description: "Practise the keys you mistype most. TypingTestKaro records your weak characters in every typing test and builds a personal drill in English, Inscript or Remington.",
    body: pageHero({ title: "Weak Key Practice", crumbs: [{ name: "Practice" }, { name: "Weak keys" }], lead: "A personal drill built from the characters you mistype most in your typing tests." }) +
      `<section class="section-sm"><div class="container"><div id="weak-info"></div><div id="lesson-player" class="mt-2"></div></div></section>`,
    css: TEST_CSS.concat(["/assets/css/pages.css"]),
    js: ["/assets/js/hindi.js"].concat(HAS_U2K ? ["/assets/js/unicode-krutidev.js"] : []).concat(["/assets/js/typing.js", "/assets/js/weak.js", "/assets/js/lesson.js"]),
    breadcrumbs: [{ name: "Practice" }, { name: "Weak keys" }]
  });

  // ---- Keyboard layout charts
  const typeable = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:\"ZXCVBNM<>?".split("");
  const REM_OVERRIDE = { "ओ": "vks", "औ": "vkS", "ई": "bZ", "ऊ": "Å (Alt+0197)", "ऑ": "vkW", "ङ": "³ (Alt+0179)", "ञ": "¥ (Alt+0165)", "ँ": "¡ (Alt+0161)" };
  const remCache = {};
  function remKeys(ch) {
    if (REM_OVERRIDE[ch]) return REM_OVERRIDE[ch];
    if (remCache[ch] !== undefined) return remCache[ch];
    let found = null;
    for (const a of typeable) if (H.krutiToUnicode(a) === ch) { found = a; break; }
    if (!found) outer: for (const a of typeable) for (const b of typeable) if (H.krutiToUnicode(a + b) === ch) { found = a + b; break outer; }
    return (remCache[ch] = found);
  }
  const insKeys = (ch) => {
    for (const k of Object.keys(H.INSCRIPT)) if (H.INSCRIPT[k] === ch) return k;
    return null;
  };
  const GROUPS = [
    ["Vowels (स्वर)", "अ आ इ ई उ ऊ ऋ ए ऐ ओ औ"],
    ["Matras & signs (मात्राएँ)", "ा ि ी ु ू ृ े ै ो ौ ं ँ ः ् ़"],
    ["Consonants (व्यंजन)", "क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह ळ"],
    ["Conjuncts (संयुक्ताक्षर)", "क्ष त्र ज्ञ श्र"],
    ["Punctuation", "। , . ?"]
  ];
  const keyLabel = (k) => k ? k.split("").map((c) => /[A-Z~!@#$%^&*()_+{}|:"<>?]/.test(c) ? `<kbd>Shift</kbd>+<kbd>${esc(c === c.toUpperCase() && /[A-Z]/.test(c) ? c : c)}</kbd>` : `<kbd>${esc(c)}</kbd>`).join(" ") : "—";
  function chartTable(fn, note) {
    return GROUPS.map(([g, list]) => `<h2>${g}</h2><div class="chart-grid" lang="hi">${list.split(" ").map((ch) => {
      const k = fn(ch);
      return `<div class="chart-cell"><span class="chart-ch">${esc(ch.length === 1 && "ािीुूृेैोौंँः़्".includes(ch) ? "◌" + ch : ch)}</span><span class="chart-k">${k && k.includes("Alt") ? esc(k) : keyLabel(k)}</span></div>`;
    }).join("")}</div>`).join("") + (note ? `<p class="muted mt-2">${note}</p>` : "");
  }
  const charts = [
    {
      slug: "hindi-inscript", layout: "inscript", name: "Mangal Inscript Keyboard Chart",
      title: "Inscript Keyboard Layout Chart — Mangal Hindi Typing Chart (Printable)",
      description: "Printable Mangal Inscript Hindi keyboard chart: every vowel, matra, consonant and conjunct with its key. Learn the Govt of India standard Unicode layout.",
      intro: "Inscript groups vowels and matras under the left hand and consonants under the right. <kbd>D</kbd> is the halant (्) — type it between two consonants to join them.",
      table: chartTable(insKeys, "Conjuncts can also be typed as consonant + <kbd>D</kbd> + consonant, e.g. <kbd>K</kbd> <kbd>D</kbd> <kbd>Shift</kbd>+<kbd>,</kbd> = क्ष.")
    },
    {
      slug: "krutidev-remington-gail", layout: "remington", name: "Krutidev / Remington GAIL Keyboard Chart",
      title: "Krutidev Keyboard Chart — Remington GAIL Hindi Typing Chart (Printable)",
      description: "Printable Krutidev 010 / Remington GAIL Hindi keyboard chart with the key for every letter, matra and conjunct. Includes i-matra and reph rules.",
      intro: "Remington GAIL uses the Krutidev 010 key positions. Press <kbd>f</kbd> <b>before</b> a consonant for ि, and <kbd>Shift</kbd>+<kbd>Z</kbd> <b>after</b> a syllable for reph (र्). Many full letters are a half letter followed by <kbd>k</kbd>.",
      table: chartTable(remKeys, "Letters marked with Alt codes need the numeric keypad in the Krutidev font; exam software usually provides them on screen.")
    },
    {
      slug: "english-qwerty", layout: "qwerty", name: "QWERTY Finger Placement Chart",
      title: "Typing Finger Chart — QWERTY Keyboard Finger Placement (Printable)",
      description: "Printable QWERTY finger placement chart: which finger types which key, home row position and tips for touch typing faster and more accurately.",
      intro: "Rest your fingers on the home row — <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd> and <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> <kbd>;</kbd> — with thumbs on the space bar. Each colour on the chart is one finger.",
      table: `<h2>Which finger types which key</h2><div class="table-wrap"><table><thead><tr><th>Finger</th><th>Left hand</th><th>Right hand</th></tr></thead><tbody>
        <tr><td>Index</td><td>4 5 R T F G V B</td><td>6 7 Y U H J N M</td></tr><tr><td>Middle</td><td>3 E D C</td><td>8 I K ,</td></tr>
        <tr><td>Ring</td><td>2 W S X</td><td>9 O L .</td></tr><tr><td>Little (pinky)</td><td>\` 1 Q A Z, Shift, Tab, Caps</td><td>0 - = P [ ] \\ ; ' /, Enter, Shift, Backspace</td></tr>
        <tr><td>Thumbs</td><td colspan="2">Space bar</td></tr></tbody></table></div>`
    }
  ];
  emit({
    path: "/keyboard-layouts/", priority: 0.7,
    title: "Hindi Keyboard Layout Charts — Inscript, Krutidev & QWERTY Finger Chart",
    description: "Printable keyboard layout charts: Mangal Inscript Hindi, Krutidev / Remington GAIL Hindi and QWERTY finger placement. Free charts for typing practice.",
    body: pageHero({ title: "Keyboard Layout Charts", crumbs: [{ name: "Keyboard layouts" }], lead: "Printable charts for every layout on TypingTestKaro — keep one next to your keyboard while you practise." }) +
      `<section class="section"><div class="container"><div class="grid grid-3">${charts.map((c) => `<a class="card" href="/keyboard-layouts/${c.slug}/"><div class="card-icon ${c.layout === "qwerty" ? "" : "accent"}">${c.layout === "qwerty" ? "⌨" : "क"}</div><h2 style="font-size:1.2rem">${esc(c.name)}</h2><p>${esc(c.description)}</p></a>`).join("")}</div></div></section>`,
    css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Keyboard layouts" }]
  });
  charts.forEach((c) => {
    emit({
      path: `/keyboard-layouts/${c.slug}/`, priority: 0.7, title: c.title, description: c.description,
      body: pageHero({ title: esc(c.name), crumbs: [{ name: "Keyboard layouts", href: "/keyboard-layouts/" }, { name: c.name }], lead: c.intro }) +
        `<section class="section-sm"><div class="container">
        <div class="row mb-2 no-print"><button class="btn btn-primary" type="button" onclick="window.print()">🖨 Print chart</button><a class="btn btn-outline" href="${c.layout === "qwerty" ? "/courses/english-typing/" : c.layout === "inscript" ? "/courses/hindi-mangal-inscript/" : "/courses/hindi-remington-gail/"}">Start the course</a></div>
        <div class="card chart-kb-card"><div class="chart-kb" data-kb-layout="${c.layout}"></div>
        <div class="finger-legend"><span><i style="background:#e25b8f"></i>Pinky</span><span><i style="background:#f0a33a"></i>Ring</span><span><i style="background:#3fb37f"></i>Middle</span><span><i style="background:#4b7bec"></i>Index</span><span><i style="background:#8e6cf0"></i>Thumb</span></div>
        ${c.layout !== "qwerty" ? '<p class="muted center mt-2" style="font-size:.85rem">Top-left of each key: character with Shift. Centre: character without Shift.</p>' : ""}</div>
        <div class="prose mt-3">${c.table}</div></div></section>`,
      css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/hindi.js", "/assets/js/typing.js"],
      breadcrumbs: [{ name: "Keyboard layouts", href: "/keyboard-layouts/" }, { name: c.name }]
    });
  });

  // ---- Keyboard quiz
  const quizFile = path.join(SRC, "data/quiz.js");
  if (fs.existsSync(quizFile)) {
    const quiz = require(quizFile);
    faqs = [{ q: "How many questions are in the keyboard quiz?", a: `There are ${quiz.length} questions on keys, shortcuts, typing tests and Hindi layouts. Each round picks 10 or 20 at random.` }];
    emit({
      path: "/quiz/keyboard-quiz/", priority: 0.7,
      title: "Keyboard Quiz — Test Your Computer Keyboard & Typing Knowledge",
      description: `Free keyboard quiz with ${quiz.length} questions: keys, shortcuts, WPM, typing test rules and Hindi Inscript/Remington layouts. Instant answers with explanations.`,
      body: pageHero({ title: "Keyboard &amp; Typing Quiz", crumbs: [{ name: "Quiz" }, { name: "Keyboard quiz" }], lead: "How well do you know your keyboard? Answer questions on keys, shortcuts, typing tests and Hindi layouts." }) +
        `<section class="section-sm"><div class="container" style="max-width:820px"><script>window.TE_QUIZ=${JSON.stringify(quiz)};</script><div id="quiz"></div></div></section>` + faqBlock(faqs),
      css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/quiz-app.js"],
      breadcrumbs: [{ name: "Quiz" }, { name: "Keyboard quiz" }],
      schema: [{ "@context": "https://schema.org", "@type": "Quiz", name: "Keyboard & Typing Quiz", about: "Computer keyboard and typing", educationalLevel: "Beginner", hasPart: quiz.slice(0, 10).map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.options[q.answer] } })) }]
    });
  }

  // ---- Shortcut keys
  const scFile = path.join(SRC, "data/shortcuts.js");
  if (fs.existsSync(scFile)) {
    const groups = require(scFile);
    const slug = (g) => g.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    emit({
      path: "/computer-shortcut-keys/", priority: 0.7,
      title: "Computer Shortcut Keys List — Windows, MS Word, Excel & Browser",
      description: "Complete list of computer shortcut keys for Windows, MS Word, MS Excel, browsers and function keys F1–F12. Useful for typing tests and computer exams.",
      body: pageHero({ title: "Computer Shortcut Keys", crumbs: [{ name: "Shortcut keys" }], lead: "The keyboard shortcuts every typist and computer-exam candidate should know." }) +
        `<section class="section-sm"><div class="container layout-sidebar"><article class="prose">
        ${groups.map((g) => `<h2 id="${slug(g.group)}">${esc(g.group)}</h2><div class="table-wrap"><table><thead><tr><th style="width:38%">Shortcut</th><th>What it does</th></tr></thead><tbody>${g.items.map((i) => `<tr><td>${i.keys.split(" + ").map((k) => `<kbd>${esc(k)}</kbd>`).join(" + ")}</td><td>${esc(i.action)}</td></tr>`).join("")}</tbody></table></div>`).join("")}
        </article><aside class="sidebar"><nav class="card toc"><h3>Sections</h3><ol>${groups.map((g) => `<li><a href="#${slug(g.group)}">${esc(g.group)}</a></li>`).join("")}</ol></nav>
        <div class="card"><h3>Test yourself</h3><p>Try the keyboard quiz to check how many shortcuts you remember.</p><a class="btn btn-primary btn-sm mt-2" href="/quiz/keyboard-quiz/">Take the quiz</a></div></aside></div></section>`,
      css: ["/assets/css/pages.css"], breadcrumbs: [{ name: "Shortcut keys" }]
    });
  }

  // ---- Unicode to Krutidev
  if (HAS_U2K) {
    faqs = [
      { q: "Why convert Unicode to Krutidev?", a: "Some offices and exam forms still require text in the Krutidev 010 font. Convert your Unicode (Mangal) Hindi here, paste it into Word and apply the Krutidev 010 font." },
      { q: "Why does the output look like English letters?", a: "Krutidev is a legacy font: the text is stored as English characters and shows as Hindi only when the Krutidev 010 font is applied." }
    ];
    emit({
      path: "/tools/unicode-to-krutidev/", priority: 0.75,
      title: "Unicode to Krutidev Converter — Mangal to Krutidev 010 Online",
      description: "Free Unicode to Krutidev converter. Convert Mangal / Unicode Hindi text to Krutidev 010 font encoding instantly in your browser for Word and print.",
      body: pageHero({ title: "Unicode to Krutidev Converter", crumbs: [{ name: "Tools" }, { name: "Unicode to Krutidev" }], lead: "Convert Mangal (Unicode) Hindi into Krutidev 010 text. Apply the Krutidev 010 font after pasting." }) +
        `<section class="section-sm"><div class="container"><div class="grid grid-2">
        <div class="card"><label class="field"><span><b>Unicode Hindi (Mangal)</b></span><textarea class="input tool-area hi" id="u2k-in" lang="hi" rows="10" placeholder="भारत एक विशाल देश है।"></textarea></label><div class="row"><button class="btn btn-primary" id="u2k-go" type="button">Convert to Krutidev</button><button class="btn btn-outline" id="u2k-sample" type="button">Try sample</button></div></div>
        <div class="card"><label class="field"><span><b>Krutidev 010 text</b></span><textarea class="input tool-area" id="u2k-out" rows="10" readonly></textarea></label><div class="row"><button class="btn btn-outline" id="u2k-copy" type="button">Copy Krutidev text</button></div></div>
        </div></div></section>` + faqBlock(faqs),
      css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/hindi.js", "/assets/js/unicode-krutidev.js", "/assets/js/tools.js"],
      breadcrumbs: [{ name: "Tools" }, { name: "Unicode to Krutidev" }], schema: [faqSchema(faqs)]
    });
  }

  // ---- English to Hindi (phonetic) typing
  if (HAS_TRANSLIT) {
    faqs = [
      { q: "How does English to Hindi typing work?", a: "Type Hindi words in English letters (Hinglish) — for example <i>bharat</i> — and press Space. The word is converted to Hindi: भारत." },
      { q: "How do I get the right spelling?", a: "Click one of the suggestions shown under the box, or use capital letters for retroflex sounds (T, D, N) and double vowels for long sounds (aa, ee, oo)." },
      { q: "Is this good for typing exams?", a: "No — exams need Inscript or Remington. Use this tool for everyday Hindi typing, and practise exam layouts in the Hindi typing test." }
    ];
    emit({
      path: "/tools/english-to-hindi-typing/", priority: 0.85,
      title: "English to Hindi Typing — Type in Hinglish, Get Hindi (Free)",
      description: "Free English to Hindi typing tool. Type Hindi words in English letters (Hinglish) and get Unicode Hindi instantly. Copy to WhatsApp, Word, Facebook or email.",
      body: pageHero({ title: "English to Hindi Typing", crumbs: [{ name: "Tools" }, { name: "English to Hindi Typing" }], lead: "Type Hindi words in English letters — <i>namaste</i> becomes नमस्ते when you press Space." }) +
        `<section class="section-sm"><div class="container"><div class="card tool-card">
        <div class="row mb-2" style="justify-content:flex-end"><button class="btn btn-primary btn-sm" id="tl-copy" type="button">Copy Hindi text</button><button class="btn btn-outline btn-sm" id="tl-clear" type="button">Clear</button></div>
        <textarea class="input tool-area hi" id="tl-text" lang="hi" rows="9" placeholder="Type here in English letters — e.g. mera bharat mahan hai" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
        <div class="tl-sugg row mt-2" id="tl-sugg" aria-live="polite"></div>
        <p class="muted mt-2" style="font-size:.85rem">Press <kbd>Space</kbd> or <kbd>Enter</kbd> to convert a word. Press <kbd>Backspace</kbd> right after a conversion to get the English word back.</p></div>
        <div class="prose mt-3" style="max-width:860px"><h2>Typing tips</h2><table><thead><tr><th>Type</th><th>Get</th><th>Type</th><th>Get</th></tr></thead><tbody>
        <tr><td>aa / A</td><td>आ / ा</td><td>kh</td><td>ख</td></tr><tr><td>ee / I</td><td>ई / ी</td><td>sh</td><td>श</td></tr>
        <tr><td>oo / U</td><td>ऊ / ू</td><td>T, Th, D, Dh, N</td><td>ट ठ ड ढ ण</td></tr><tr><td>ai, au</td><td>ऐ, औ</td><td>ksh / x</td><td>क्ष</td></tr>
        <tr><td>ri</td><td>ऋ / ृ</td><td>gy</td><td>ज्ञ</td></tr></tbody></table></div></div></section>` + faqBlock(faqs),
      css: TEST_CSS.concat(["/assets/css/pages.css"]), js: ["/assets/js/translit.js", "/assets/js/tools.js"],
      breadcrumbs: [{ name: "Tools" }, { name: "English to Hindi Typing" }], schema: [faqSchema(faqs)]
    });
  }

  // ---- Offline fallback
  emit({
    path: "/offline/", noindex: true, title: "You are offline — TypingTestKaro", description: "You are offline.",
    body: `<section class="section"><div class="container center" style="max-width:640px"><div class="game-emoji">📴</div><h1 style="font-size:2rem">You're offline</h1><p class="muted">This page isn't saved on your device yet. Pages you've opened before — including typing tests — still work offline.</p><div class="row" style="justify-content:center"><a class="btn btn-primary" href="/typing-test/">Typing test</a><a class="btn btn-outline" href="/">Home</a></div></div></section>`,
    css: ["/assets/css/pages.css"]
  });
})();

/* ---------------- sitemap, robots, manifest, favicon ---------------- */
const today = "2026-09-24";
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE.url}${p.path}</loc><lastmod>${today}</lastmod><priority>${p.priority.toFixed(2)}</priority></url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /my-progress/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
write("manifest.webmanifest", JSON.stringify({
  name: "TypingTestKaro — Typing Test for Govt Exams", short_name: "TypingTestKaro", start_url: "/", display: "standalone",
  background_color: "#f6faf8", theme_color: "#0f766e", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }]
}, null, 2));
write("favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#053b33"/><stop offset=".6" stop-color="#0f766e"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><text x="32" y="42" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="800" fill="#fff" text-anchor="middle">TK</text></svg>`);

const precache = ["/", "/offline/", "/typing-test/", "/assets/css/main.css", "/assets/css/typing.css", "/assets/css/pages.css",
  "/assets/js/main.js", "/assets/js/fx.js", "/assets/fonts/uncut-sans-variable.woff2", "/assets/js/hindi.js", "/assets/js/typing.js", "/assets/js/passages.js", "/favicon.svg", "/manifest.webmanifest"]
  .concat(HAS_MR ? ["/assets/js/passages-mr.js"] : [])
  .map((u) => (u.startsWith("/assets/") ? `${u}?v=${global.BUILD_V}` : u));
write("sw.js", fs.readFileSync(path.join(__dirname, "build/sw.template.js"), "utf8")
  .replace("__VERSION__", global.BUILD_V).replace("__PRECACHE__", JSON.stringify(precache)));

console.log(`Built ${pages.length} indexable pages → ${path.relative(process.cwd(), OUT)}/`);
