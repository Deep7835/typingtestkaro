/* Shared page shell: <head>, header navigation, footer. */
const { exams, CATEGORIES } = require("../src/data/exams.js");

const SITE = {
  name: "TypingTestKaro",
  url: "https://www.typingtestkaro.com",
  tagline: "Typing test for government exams — Hindi & English",
  email: "support@typingtestkaro.com",
  // Date shown as "Last updated" on exam and info pages (bump when content is reviewed).
  updated: "2026-09-25",
  // Analytics loads only after the visitor accepts cookies. Fill in ONE of these to enable:
  analytics: {
    ga4: "",               // Google Analytics 4 measurement ID, e.g. "G-XXXXXXXXXX"
    plausible: "",         // Plausible domain, e.g. "typingtestkaro.com"
    cloudflareToken: ""    // Cloudflare Web Analytics token
  }
};

// Site author (shown on articles, the author page, About page and in structured data).
const AUTHOR = {
  name: "Deepam Mishra",
  slug: "deepam-mishra",
  path: "/author/deepam-mishra/",
  initials: "DM",
  role: "Founder, TypingTestKaro",
  experience: [
    { org: "DRDO — Integrated Test Range (ITR)", note: "Defence Research & Development Organisation" },
    { org: "CSIR-CEERI, Pilani", note: "Central Electronics Engineering Research Institute" }
  ],
  short: "Founder of TypingTestKaro, with experience at DRDO ITR and CSIR-CEERI Pilani. Now building businesses — including free exam-preparation tools for India's government job aspirants.",
  bio: "Deepam Mishra is the founder of TypingTestKaro. Deepam has experience at DRDO's Integrated Test Range (ITR) and at CSIR-CEERI, Pilani — two of India's national research establishments — and now runs a business. TypingTestKaro grew out of a simple observation: thousands of candidates clear the written exam every year and then struggle in the typing skill test, not for lack of ability but for lack of the right practice tools. The goal of this site is to give every aspirant free, exam-accurate practice in English and Hindi."
};

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

const GAMES = [
  { slug: "typing-race", name: "Typing Race", icon: "🏎", short: "Race three bot cars — your typing speed drives your car.", level: "All levels" },
  { slug: "word-rain", name: "Word Rain", icon: "🌧", short: "Type the falling words before they hit the ground.", level: "Intermediate" },
  { slug: "balloon-pop", name: "Balloon Pop", icon: "🎈", short: "Pop letter balloons — perfect for beginners and kids.", level: "Beginner" },
  { slug: "word-blitz", name: "Word Blitz", icon: "⚡", short: "A 60-second word sprint that measures your real WPM.", level: "All levels" },
  { slug: "keyboard-ninja", name: "Keyboard Ninja", icon: "🥷", short: "Find keys fast with the right finger — learn the layout.", level: "Beginner" }
];

const TESTS = [
  { href: "/typing-test/english/", name: "English Typing Test", sub: "QWERTY · exam passages" },
  { href: "/typing-test/hindi/", name: "Hindi Typing Test", sub: "All Hindi layouts" },
  { href: "/typing-test/hindi-mangal-inscript/", name: "Mangal Inscript Test", sub: "Unicode Hindi" },
  { href: "/typing-test/hindi-krutidev/", name: "Krutidev Typing Test", sub: "Krutidev 010" },
  { href: "/typing-test/hindi-remington-gail/", name: "Remington GAIL Test", sub: "Typewriter layout" },
  { href: "/typing-test/marathi/", name: "Marathi Typing Test", sub: "Inscript & Remington" },
  { href: "/typing-test/1-minute/", name: "1 Minute Typing Test", sub: "Quick speed check" },
  { href: "/typing-test/5-minute/", name: "5 Minute Typing Test", sub: "Stamina test" },
  { href: "/typing-test/10-minute/", name: "10 Minute Typing Test", sub: "Full exam length" },
  { href: "/typing-test/daily-passage/", name: "Daily Passage", sub: "A new passage every day" },
  { href: "/typing-test/custom-text/", name: "Custom Text Typing Test", sub: "Paste your own passage" },
  { href: "/typing-test/numeric-data-entry/", name: "Numeric Data Entry Test", sub: "Numbers for DEO / DEST" },
  { href: "/typing-test/dictation/", name: "Dictation Typing Test", sub: "Type what you hear" }
];

const TOOLS = [
  { href: "/tools/hindi-typing-online/", name: "Hindi Typing Online", sub: "Type Hindi & copy text" },
  { href: "/tools/english-to-hindi-typing/", name: "English to Hindi Typing", sub: "Type Hinglish, get Hindi" },
  { href: "/tools/krutidev-to-unicode/", name: "Krutidev to Unicode", sub: "Font converter" },
  { href: "/tools/unicode-to-krutidev/", name: "Unicode to Krutidev", sub: "Mangal → Krutidev" },
  { href: "/tools/typing-speed-calculator/", name: "Typing Speed Calculator", sub: "Gross, net WPM & KDPH" },
  { href: "/keyboard-layouts/", name: "Keyboard Layout Charts", sub: "Inscript, Krutidev, QWERTY" },
  { href: "/quiz/keyboard-quiz/", name: "Keyboard Quiz", sub: "Test your keyboard IQ" },
  { href: "/computer-shortcut-keys/", name: "Computer Shortcut Keys", sub: "Windows, Word, Excel" },
  { href: "/practice/weak-keys/", name: "Weak Key Practice", sub: "Drill your mistakes" },
  { href: "/my-progress/", name: "My Progress", sub: "Your saved results" }
];

const chev = '<svg class="chev" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z"/></svg>';

function dd(label, id, inner, cls, active) {
  return `<li><button class="nav-link${active || ""}" type="button" aria-expanded="false" aria-controls="dd-${id}">${label}${chev}</button>` +
    `<div class="dropdown${cls ? " " + cls : ""}" id="dd-${id}">${inner}</div></li>`;
}

function sectionOf(path, active) {
  if (active) return active;
  if (path === "/") return "home";
  if (path.startsWith("/typing-test/")) return "tests";
  if (path.startsWith("/exams/")) return "exams";
  if (path.startsWith("/courses/")) return "courses";
  if (path.startsWith("/games/")) return "games";
  if (path.startsWith("/blog/")) return "blog";
  if (/^\/(tools|keyboard-layouts|quiz|computer-shortcut-keys|practice|my-progress)\//.test(path)) return "tools";
  return "";
}

function header(page, courses) {
  const section = sectionOf(page.path || "", page.active);
  const tests = TESTS.map((t) => `<a href="${t.href}">${esc(t.name)}<small>${esc(t.sub)}</small></a>`).join("") +
    '<a class="dd-all" href="/typing-test/">All typing tests →</a>';
  const examCols = CATEGORIES.map((c) => `<div><div class="dd-title">${esc(c.short)}</div>` +
    exams.filter((e) => e.category === c.id).map((e) => `<a href="/exams/${e.slug}/">${esc(e.name)}</a>`).join("") + "</div>").join("");
  const examsMenu = examCols + '<div style="grid-column:1/-1"><a class="dd-all" href="/exams/">View all exam typing tests →</a></div>';
  const courseMenu = courses.map((c) => `<a href="/courses/${c.slug}/">${esc(c.name.replace("Hindi Typing Course — ", "Hindi — "))}<small>${c.lessons.length} lessons</small></a>`).join("") +
    '<a class="dd-all" href="/courses/">All courses →</a>';
  const gameMenu = GAMES.map((g) => `<a href="/games/${g.slug}/">${g.icon} ${esc(g.name)}<small>${esc(g.level)}</small></a>`).join("") +
    '<a class="dd-all" href="/games/">All typing games →</a>';
  const toolMenu = TOOLS.map((t) => `<a href="${t.href}">${esc(t.name)}<small>${esc(t.sub)}</small></a>`).join("");

  const cur = (key) => (section === key ? " active" : "");
  const icon = {
    sun: '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container">
    <div class="nav-bar">
      <a class="logo" href="/" aria-label="${SITE.name} home"><span class="logo-mark">TK</span><span>TypingTest<b>Karo</b></span></a>
      <nav class="main-nav" aria-label="Main">
        <ul class="nav-pill">
          <li><a class="nav-link${cur("home")}" href="/"${section === "home" ? ' aria-current="page"' : ""}>Home</a></li>
          ${dd("Typing Test", "tests", tests, "wide", cur("tests"))}
          ${dd("Exams", "exams", examsMenu, "mega", cur("exams"))}
          ${dd("Courses", "courses", courseMenu, "", cur("courses"))}
          ${dd("Games", "games", gameMenu, "", cur("games"))}
          ${dd("Tools", "tools", toolMenu, "wide wide-right", cur("tools"))}
          <li><a class="nav-link${cur("blog")}" href="/blog/"${section === "blog" ? ' aria-current="page"' : ""}>Blog</a></li>
        </ul>
        <div class="nav-mobile-cta"><a class="btn btn-outline" href="/my-progress/">My Progress</a><a class="btn btn-primary" href="/typing-test/">Start Test</a></div>
      </nav>
      <div class="nav-actions">
        <button class="nav-circle search-open" type="button" aria-label="Search the site (press /)" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
        <button class="nav-circle theme-toggle" type="button" aria-label="Toggle dark mode">${icon.sun}${icon.moon}</button>
        <span class="nav-sep" aria-hidden="true"></span>
        <a class="nav-btn nav-btn-dark" href="/my-progress/">My Progress</a>
        <span class="nav-sep" aria-hidden="true"></span>
        <a class="nav-btn nav-btn-light" href="/typing-test/">Start Test</a>
        <button class="nav-circle menu-toggle" type="button" aria-label="Open menu" aria-expanded="false">${icon.menu}</button>
      </div>
    </div>
  </div>
</header>`;
}

// Footer: 4 columns × 5 short links each, so every column lines up evenly.
const FOOT_COLS = [
  { title: "Typing Tests", links: [["/typing-test/english/", "English Typing Test"], ["/typing-test/hindi/", "Hindi Typing Test"], ["/typing-test/hindi-krutidev/", "Krutidev Typing Test"], ["/typing-test/hindi-mangal-inscript/", "Mangal Typing Test"], ["/typing-test/10-minute/", "10 Minute Typing Test"]] },
  { title: "Popular Exams", links: [["/exams/ssc-chsl/", "SSC CHSL Typing Test"], ["/exams/ssc-cgl-dest/", "SSC CGL DEST Test"], ["/exams/rrb-ntpc-graduate/", "RRB NTPC Typing Test"], ["/exams/cpct/", "CPCT Typing Test"], ["/exams/", "All Exam Typing Tests"]] },
  { title: "Learn &amp; Play", links: [["/courses/english-typing/", "English Typing Course"], ["/courses/hindi-remington-gail/", "Hindi Typing Course"], ["/games/", "Typing Games"], ["/tools/hindi-typing-online/", "Hindi Typing Online"], ["/blog/", "Typing Blog"]] },
  { title: "Company", links: [["/about/", "About Us"], ["/contact/", "Contact Us"], ["/privacy-policy/", "Privacy Policy"], ["/terms/", "Terms of Use"], ["/disclaimer/", "Disclaimer"]] }
];

function footer(courses) {
  const pop = exams.filter((e) => e.popular).slice(0, 8);
  const li = (href, text) => `<li><a href="${href}">${text}</a></li>`;
  return `<footer class="site-footer">
  <div class="container">
    <div class="foot-card">
      <div class="foot-top">
        <div class="foot-brand">
          <a class="logo" href="/"><span class="logo-mark">TK</span><span>TypingTest<b>Karo</b></span></a>
          <p>Free typing tests, courses and games for SSC, Railway, CPCT, High Court and state government exams — in English and Hindi (Mangal Inscript, Krutidev, Remington GAIL).</p>
          <div class="foot-cta">
            <a class="nav-btn nav-btn-light" href="/typing-test/">Start Test</a>
            <a class="nav-btn nav-btn-dark" href="/my-progress/">My Progress</a>
          </div>
        </div>
        <nav class="foot-cols" aria-label="Footer">
          ${FOOT_COLS.map((c) => `<div><h4>${c.title}</h4><ul>${c.links.map(([href, text]) => li(href, text)).join("")}</ul></div>`).join("")}
        </nav>
      </div>
      <p class="foot-note">Exam rules on this site are summarised from recent notifications. Always confirm with the official notification.</p>
      <div class="foot-bar">
        <span class="foot-copy">© <span data-year>2026</span> ${SITE.name} · Founded by <a href="${AUTHOR.path}">${AUTHOR.name}</a> · Made in India</span>
        <span class="foot-bar-links"><a href="/privacy-policy/">Privacy</a><a href="/terms/">Terms</a><a href="#" data-cookie-settings>Cookies</a><a href="/sitemap.xml">Sitemap</a></span>
        <a class="nav-circle foot-top-btn" href="#main" aria-label="Back to top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></a>
      </div>
    </div>
  </div>
</footer>`;
}

// Site-wide overlays: search dialog, floating contact / back-to-top, cookie banner, confirm dialog.
function widgets() {
  return `<div class="search-dialog" id="search-dialog" role="dialog" aria-modal="true" aria-label="Search TypingTestKaro" hidden>
  <div class="search-backdrop" data-close></div>
  <div class="search-panel">
    <div class="search-bar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input type="search" id="site-search" placeholder="Search tests, exams, courses, articles…" autocomplete="off" aria-label="Search" aria-controls="search-results">
      <kbd class="search-esc">Esc</kbd></div>
    <div class="search-results" id="search-results" role="listbox" aria-label="Search results"><p class="search-hint">Try <b>SSC CHSL</b>, <b>Krutidev</b>, <b>1 minute</b> or <b>WPM</b></p></div>
    <div class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open</span><a href="/search/">Full search page →</a></div>
  </div>
</div>
<div class="fab-stack">
  <div class="fab-menu" id="fab-menu" hidden>
    <a href="mailto:${SITE.email}"><span aria-hidden="true">✉</span> Email us<small>${SITE.email}</small></a>
    <a href="/contact/"><span aria-hidden="true">💬</span> Contact form<small>Feedback &amp; exam updates</small></a>
    <a href="/#faq"><span aria-hidden="true">❓</span> FAQs<small>Quick answers</small></a>
  </div>
  <button class="fab fab-top" type="button" aria-label="Back to top" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
  <button class="fab fab-contact" type="button" aria-label="Contact us" aria-expanded="false" aria-controls="fab-menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></button>
</div>
<div class="cookie-banner" id="cookie-banner" role="region" aria-label="Cookie consent" hidden>
  <p><b>We value your privacy.</b> We use essential browser storage to save your test results on your device. With your permission we'd also use analytics cookies to understand which features help students most. <a href="/privacy-policy/">Privacy policy</a></p>
  <div class="cookie-actions"><button class="btn btn-outline btn-sm" type="button" data-consent="essential">Essential only</button><button class="btn btn-primary btn-sm" type="button" data-consent="all">Accept all</button></div>
</div>
<div class="confirm-dialog" id="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text" hidden>
  <div class="search-backdrop" data-cancel></div>
  <div class="confirm-panel"><h2 id="confirm-title">Are you sure?</h2><p id="confirm-text"></p>
  <div class="row" style="justify-content:flex-end"><button class="btn btn-outline" type="button" data-cancel>Cancel</button><button class="btn btn-danger" type="button" data-ok>Confirm</button></div></div>
</div>`;
}

/**
 * Render a complete HTML document.
 * page: { path, title, description, body, css[], js[], schema[], active, noindex, ogType, head }
 */
function render(page, courses) {
  const url = SITE.url + page.path;
  const css = ["/assets/css/main.css"].concat(page.css || []);
  // GSAP (CDN) + fx.js give every page the same scroll/intro motion; page scripts that
  // need GSAP (home-fx.js) come after it.
  const GSAP = ["https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js", "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"];
  const js = GSAP.concat((page.js || []).filter((j) => !GSAP.includes(j)), ["/assets/js/fx.js", "/assets/js/site.js", "/assets/js/main.js"]);
  const schema = [].concat(page.schema || []);
  if (page.breadcrumbs && page.breadcrumbs.length) {
    schema.push({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [{ name: "Home", href: "/" }].concat(page.breadcrumbs).map((b, i) => ({
        "@type": "ListItem", position: i + 1, name: b.name, item: SITE.url + (b.href || page.path)
      }))
    });
  }
  return `<!doctype html>
<html lang="${page.lang || "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
${page.keywords ? `<meta name="keywords" content="${esc(page.keywords)}">\n` : ""}<link rel="canonical" href="${url}">
${page.noindex ? '<meta name="robots" content="noindex, follow">\n' : '<meta name="robots" content="index, follow, max-image-preview:large">\n'}<meta name="theme-color" content="#0f766e">
<meta property="og:type" content="${page.ogType || "website"}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE.url}/assets/img/og-image.png">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<script>window.TE_SITE=${JSON.stringify({ email: SITE.email, analytics: SITE.analytics })};</script>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="/assets/fonts/uncut-sans-variable.woff2" as="font" type="font/woff2" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
${css.map((c) => `<link rel="stylesheet" href="${c}?v=${global.BUILD_V || 1}">`).join("\n")}
<script>try{var t=localStorage.getItem("te_theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
${schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}
${page.head || ""}
</head>
<body class="${page.bodyClass || ""}">
<div class="scroll-progress" aria-hidden="true"><i></i></div>
${header(page, courses)}
<main id="main">
${page.body}
</main>
${footer(courses)}
${widgets()}
${js.map((j) => `<script src="${j.startsWith("/") ? `${j}?v=${global.BUILD_V || 1}` : j}" defer></script>`).join("\n")}
</body>
</html>
`;
}

// Floating letters + glow orbs behind page headers (CSS-animated, decorative only)
const PH_DECO = '<div class="ph-deco" aria-hidden="true"><i class="ph-orb o1"></i><i class="ph-orb o2"></i>' +
  ["A", "क", "W", "अ", "T", "ह", "S", "म", "K", "र"].map((c, i) => `<span class="g${i}">${c}</span>`).join("") + "</div>";

function pageHero({ title, lead, crumbs = [], badges = [] }) {
  const bc = crumbs.length
    ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a>${crumbs.map((c) => `<span>/</span>${c.href ? `<a href="${c.href}">${esc(c.name)}</a>` : esc(c.name)}`).join("")}</nav>`
    : "";
  return `<section class="page-hero">${PH_DECO}<div class="container">${bc}<h1>${title}</h1>${lead ? `<p>${lead}</p>` : ""}` +
    (badges.length ? `<div class="chips mt-2">${badges.map((b) => `<span class="badge">${b}</span>`).join("")}</div>` : "") +
    "</div></section>";
}

function faqBlock(faqs, heading = "Frequently asked questions") {
  return `<section class="section" id="faq"><div class="container"><div class="section-head"><h2>${heading}</h2></div><div class="faq">` +
    faqs.map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${f.a}</p></details>`).join("") +
    "</div></div></section>";
}
function faqSchema(faqs) {
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, "") } }))
  };
}

module.exports = { AUTHOR, PH_DECO, SITE, GAMES, TESTS, TOOLS, esc, render, pageHero, faqBlock, faqSchema };
