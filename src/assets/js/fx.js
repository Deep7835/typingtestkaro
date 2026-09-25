/*
 * TypingTestKaro — site-wide motion (GSAP + ScrollTrigger from the CDN).
 * Progressive enhancement: everything is visible without this script, nothing
 * animates for prefers-reduced-motion, and interactive tools (typing test,
 * lessons, games, quiz) are never animated so they are ready to use instantly.
 */
(function () {
  "use strict";
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- stat counters (work even without GSAP) ---------- */
  function countUp(el) {
    var end = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduced || !gsap) { el.textContent = end; return; }
    var o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v); } });
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    [].forEach.call(counters, function (c) { io.observe(c); });
  }

  if (!gsap || !ST || reduced) return;
  gsap.registerPlugin(ST);
  document.documentElement.classList.add("fx");
  // Remove GSAP's inline styles when a tween ends so CSS hover transforms keep working.
  var CLEAR = "transform,opacity,visibility";

  // Never animate anything inside live tools.
  var LIVE = ".tt, .lp, #lesson-player, #game-root, #quiz, #dictation, .hero-visual, .tool-card, #hindi-pad, form";
  function usable(el) { return !el.closest(LIVE) && !el.querySelector(".tt, #game-root, #quiz, #lesson-player, #dictation"); }
  function pick(sel) { return gsap.utils.toArray(sel).filter(usable); }

  /* ---------- page hero intro ---------- */
  var ph = document.querySelector(".page-hero .container");
  if (ph) {
    // Title and description stay visible (they are the LCP element); animate the rest.
    gsap.from(ph.querySelectorAll(".breadcrumbs, .chips, .badge"), { y: 14, autoAlpha: 0, duration: 0.6, stagger: 0.05, ease: "power3.out", clearProps: CLEAR });
    gsap.from(".ph-deco span", { scale: 0.4, autoAlpha: 0, duration: 0.9, stagger: 0.06, ease: "back.out(2)", delay: 0.2, clearProps: CLEAR });
    gsap.to(".page-hero .ph-deco", { yPercent: 30, ease: "none", scrollTrigger: { trigger: ".page-hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* ---------- section headings ---------- */
  pick(".section-head").forEach(function (h) {
    gsap.from(h.children, { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.08, ease: "power2.out", clearProps: CLEAR,
      scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });

  /* ---------- content blocks reveal in staggered batches ---------- */
  var blocks = pick([
    ".card", ".lesson-row", ".chart-cell", ".faq details", ".table-wrap", ".callout",
    ".stats-strip .stat", ".quick", ".prose > h2", ".prose > .table-wrap", ".prose > blockquote"
  ].join(","));
  if (blocks.length) {
    gsap.set(blocks, { y: 32, autoAlpha: 0 });
    ST.batch(blocks, {
      start: "top 92%", once: true,
      onEnter: function (batch) { gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.65, stagger: 0.06, ease: "power2.out", overwrite: true, clearProps: CLEAR }); }
    });
  }

  /* ---------- table rows & CTA band ---------- */
  pick(".speed-table").forEach(function (t) {
    gsap.from(t.querySelectorAll("tbody tr"), { x: -20, autoAlpha: 0, duration: 0.45, stagger: 0.03, ease: "power1.out", clearProps: CLEAR,
      scrollTrigger: { trigger: t, start: "top 82%", once: true } });
  });
  pick(".cta-band").forEach(function (c) {
    gsap.from(c, { scale: 0.94, autoAlpha: 0, duration: 0.8, ease: "power2.out", clearProps: CLEAR, scrollTrigger: { trigger: c, start: "top 90%", once: true } });
  });

  // Content that appears later (tests, filters) can change page height.
  window.addEventListener("load", function () { ST.refresh(); });
  var search = document.getElementById("exam-search");
  if (search) search.addEventListener("input", function () { ST.refresh(); });
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-cat], details summary")) setTimeout(function () { ST.refresh(); }, 50);
  });
})();
