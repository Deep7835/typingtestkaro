/*
 * TypingTestKaro — homepage-only motion: hero intro and the 3D keyboard's scroll link.
 * Generic reveals, counters and headings come from fx.js (loaded on every page).
 */
(function () {
  "use strict";
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!gsap || !ST || reduced) return;
  gsap.registerPlugin(ST);

  var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  // The H1 and lead paragraph are the Largest Contentful Paint candidates, so they are
  // never hidden; only the decorative/secondary pieces animate in.
  // Animate whole rows (not individual buttons, whose CSS hover/active transforms would
  // fight GSAP), and clear GSAP's inline styles afterwards so CSS is back in charge.
  var CLEAR = "transform,opacity,visibility";
  tl.from([".hero-pill", ".hero-cta", ".hero-points"], { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08, clearProps: CLEAR })
    .from(".hero-visual", { y: 40, autoAlpha: 0, scale: 0.96, duration: 1, clearProps: CLEAR }, 0.1)
    .from(".hero-badge", { scale: 0.6, autoAlpha: 0, duration: 0.6, stagger: 0.12, ease: "back.out(2)", clearProps: CLEAR }, 0.5);

  // 3D keyboard tips back and sinks as the hero scrolls away
  ST.create({
    trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6,
    onUpdate: function (self) { if (window.TEHero3D) window.TEHero3D.setScroll(self.progress); }
  });
  gsap.to(".hero-orb", { yPercent: 40, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
})();
