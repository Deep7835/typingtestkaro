/*
 * TypingTestKaro — site-wide UX: search dialog, scroll progress, back-to-top,
 * contact button, cookie consent + analytics (consent-gated) with UTM capture,
 * confirm dialog, copy buttons and contact-form validation.
 */
(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- toast ---------------- */
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2000);
  }
  window.TEToast = toast;

  /* ---------------- confirm dialog (replaces window.confirm) ---------------- */
  var confirmEl = $("#confirm-dialog");
  window.TEConfirm = function (text, okLabel, title) {
    if (!confirmEl) return Promise.resolve(window.confirm(text));
    return new Promise(function (resolve) {
      var last = document.activeElement;
      $("#confirm-title", confirmEl).textContent = title || "Are you sure?";
      $("#confirm-text", confirmEl).textContent = text;
      var ok = $("[data-ok]", confirmEl);
      ok.textContent = okLabel || "Confirm";
      confirmEl.hidden = false;
      document.body.classList.add("modal-open");
      ok.focus();
      function done(v) {
        confirmEl.hidden = true;
        document.body.classList.remove("modal-open");
        confirmEl.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey, true);
        if (last && last.focus) last.focus();
        resolve(v);
      }
      function onClick(e) {
        if (e.target.closest("[data-ok]")) done(true);
        else if (e.target.closest("[data-cancel]")) done(false);
      }
      function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); done(false); } }
      confirmEl.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey, true);
    });
  };

  /* ---------------- scroll progress + back to top ---------------- */
  var bar = $(".scroll-progress i"), topBtn = $(".fab-top"), ticking = false;
  function onScroll() {
    ticking = false;
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? h.scrollTop / max : 0;
    if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    if (topBtn) topBtn.hidden = h.scrollTop < 600;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (topBtn) topBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    var main = $("#main"); if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); }
  });

  /* ---------------- floating contact button ---------------- */
  var fab = $(".fab-contact"), fabMenu = $("#fab-menu");
  if (fab && fabMenu) {
    fab.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = fabMenu.hidden;
      fabMenu.hidden = !open;
      fab.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { var a = $("a", fabMenu); if (a) a.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!fabMenu.hidden && !e.target.closest(".fab-stack")) { fabMenu.hidden = true; fab.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !fabMenu.hidden) { fabMenu.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.focus(); }
    });
  }

  /* ---------------- site search ---------------- */
  var dlg = $("#search-dialog"), input = $("#site-search"), results = $("#search-results");
  var index = null, loading = null, active = -1;
  var TYPE_LABEL = { test: "Typing test", exam: "Exam", course: "Course", lesson: "Lesson", game: "Game", tool: "Tool", blog: "Article", page: "Page" };
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    loading = fetch("/search-index.json").then(function (r) { return r.json(); }).then(function (d) { index = d; return d; })
      .catch(function () { index = []; return index; });
    return loading;
  }
  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index.map(function (it) {
      var t = it.t.toLowerCase(), hay = (it.t + " " + it.d + " " + (it.x || "")).toLowerCase(), score = 0;
      for (var i = 0; i < terms.length; i++) {
        var w = terms[i];
        if (hay.indexOf(w) === -1) return null; // every term must match somewhere
        if (t.indexOf(w) === 0) score += 6; else if (t.indexOf(" " + w) !== -1) score += 4; else if (t.indexOf(w) !== -1) score += 3; else score += 1;
      }
      if (t.indexOf(q.toLowerCase()) !== -1) score += 5;
      score += it.w || 0; // type weight (tests & exams first)
      return { it: it, s: score };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 12).map(function (r) { return r.it; });
  }
  function highlight(text, q) {
    var out = esc(text);
    q.split(/\s+/).filter(function (w) { return w.length > 1; }).forEach(function (w) {
      out = out.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>");
    });
    return out;
  }
  function render(q) {
    active = -1;
    if (!q.trim()) { results.innerHTML = '<p class="search-hint">Try <b>SSC CHSL</b>, <b>Krutidev</b>, <b>1 minute</b> or <b>WPM</b></p>'; return; }
    var list = search(q);
    if (!list.length) { results.innerHTML = '<p class="search-hint">No results for “' + esc(q) + '”. Try another word, or browse <a href="/exams/">all exams</a>.</p>'; return; }
    results.innerHTML = list.map(function (it, i) {
      return '<a class="search-item" role="option" id="sr-' + i + '" href="' + it.u + '"><span class="search-type t-' + it.k + '">' + (TYPE_LABEL[it.k] || "Page") + '</span>' +
        '<span class="search-text"><b>' + highlight(it.t, q) + "</b><small>" + highlight(it.d, q) + "</small></span></a>";
    }).join("");
  }
  function move(d) {
    var items = $$(".search-item", results);
    if (!items.length) return;
    active = (active + d + items.length) % items.length;
    items.forEach(function (el, i) { el.classList.toggle("active", i === active); el.setAttribute("aria-selected", i === active ? "true" : "false"); });
    items[active].scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", items[active].id);
  }
  function openSearch(prefill) {
    if (!dlg) return;
    dlg.hidden = false;
    document.body.classList.add("modal-open");
    if (prefill != null) input.value = prefill;
    input.focus(); input.select();
    loadIndex().then(function () { render(input.value); });
  }
  function closeSearch() {
    if (!dlg || dlg.hidden) return;
    dlg.hidden = true;
    document.body.classList.remove("modal-open");
    var btn = $(".search-open"); if (btn) btn.focus();
  }
  if (dlg) {
    $$(".search-open").forEach(function (b) { b.addEventListener("click", function () { openSearch(); }); });
    input.addEventListener("input", function () { loadIndex().then(function () { render(input.value); }); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        var items = $$(".search-item", results);
        var target = items[active >= 0 ? active : 0];
        if (target) { e.preventDefault(); location.href = target.getAttribute("href"); }
        else if (input.value.trim()) location.href = "/search/?q=" + encodeURIComponent(input.value.trim());
      }
    });
    dlg.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeSearch(); });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase(), typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
      if (e.key === "Escape") closeSearch();
      else if (!typing && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"))) { e.preventDefault(); openSearch(); }
    });
  }
  // full search page
  var pageBox = $("#search-page-results"), pageInput = $("#search-page-input");
  if (pageBox && pageInput) {
    var q0 = new URLSearchParams(location.search).get("q") || "";
    pageInput.value = q0;
    var runPage = function () {
      loadIndex().then(function () {
        var q = pageInput.value.trim(), list = q ? search(q) : [];
        history.replaceState(null, "", q ? "?q=" + encodeURIComponent(q) : location.pathname);
        $("#search-page-count").textContent = q ? list.length + " result" + (list.length === 1 ? "" : "s") + " for “" + q + "”" : "";
        pageBox.innerHTML = !q ? "" : list.length ? list.map(function (it) {
          return '<a class="search-item card" href="' + it.u + '"><span class="search-type t-' + it.k + '">' + (TYPE_LABEL[it.k] || "Page") + '</span><span class="search-text"><b>' + highlight(it.t, q) + "</b><small>" + highlight(it.d, q) + "</small></span></a>";
        }).join("") : '<p class="muted">No results. Try a shorter word like “SSC”, “Hindi” or “speed”.</p>';
      });
    };
    pageInput.addEventListener("input", runPage);
    if (q0) runPage();
  }

  /* ---------------- copy buttons: [data-copy="text"] or [data-copy-url] ---------------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy], [data-copy-url]");
    if (!b) return;
    var text = b.hasAttribute("data-copy-url") ? location.href.split("#")[0] : b.getAttribute("data-copy");
    var ok = function () { var old = b.innerHTML; b.classList.add("copied"); b.innerHTML = "✓ Copied"; toast("Copied to clipboard"); setTimeout(function () { b.innerHTML = old; b.classList.remove("copied"); }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { toast("Press Ctrl+C to copy"); });
    else toast("Press Ctrl+C to copy");
  });

  /* ---------------- contact form: validation, spam trap, success/error states ---------------- */
  var form = $("#contact-form");
  if (form) {
    var started = Date.now();
    var status = $(".form-status", form);
    var show = function (type, msg) { status.className = "form-status " + type; status.textContent = msg; status.hidden = false; };
    var fieldError = function (el, msg) {
      var holder = el.closest(".field"), err = holder && $(".field-error", holder);
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) { err.textContent = msg || ""; err.hidden = !msg; }
    };
    var validate = function (el) {
      var v = el.value.trim(), msg = "";
      if (el.required && !v) msg = "This field is required.";
      else if (el.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "Please enter a valid email address.";
      else if (el.name === "message" && v && v.length < 10) msg = "Please write at least 10 characters.";
      fieldError(el, msg);
      return !msg;
    };
    $$("input:not([name=website]), textarea", form).forEach(function (el) {
      el.addEventListener("blur", function () { validate(el); });
      el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") validate(el); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = $$("input:not([name=website]), textarea", form), valid = fields.map(validate).every(Boolean);
      if (!valid) { show("error", "Please fix the highlighted fields and try again."); var bad = $("[aria-invalid=true]", form); if (bad) bad.focus(); return; }
      // Spam protection: hidden honeypot must stay empty and humans take more than 3 seconds.
      if (form.website.value || Date.now() - started < 3000) { show("error", "Something went wrong — please wait a moment and try again."); return; }
      var body = "Name: " + form.name.value.trim() + "\nEmail: " + form.email.value.trim() + "\nTopic: " + form.topic.value + "\n\n" + form.message.value.trim();
      var href = "mailto:" + (window.TE_SITE && window.TE_SITE.email) + "?subject=" + encodeURIComponent("[TypingTestKaro] " + form.topic.value) + "&body=" + encodeURIComponent(body);
      window.location.href = href;
      show("success", "Thanks, " + form.name.value.trim().split(" ")[0] + "! Your email app should open with the message ready — just press Send. If nothing opens, email us at " + window.TE_SITE.email + ".");
      track("contact_form_submit", { topic: form.topic.value });
      form.reset(); started = Date.now();
    });
  }

  /* ---------------- UTM capture (first & last touch) ---------------- */
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  (function captureUtm() {
    var q = new URLSearchParams(location.search), found = {};
    UTM_KEYS.forEach(function (k) { if (q.get(k)) found[k] = q.get(k).slice(0, 100); });
    if (!Object.keys(found).length) return;
    found.landing = location.pathname; found.at = new Date().toISOString();
    if (!get("te_utm_first")) set("te_utm_first", JSON.stringify(found));
    set("te_utm_last", JSON.stringify(found));
  })();
  function utm() { try { return JSON.parse(get("te_utm_last")) || {}; } catch (e) { return {}; } }

  /* ---------------- cookie consent + analytics ---------------- */
  var cfg = (window.TE_SITE && window.TE_SITE.analytics) || {};
  var hasAnalytics = !!(cfg.ga4 || cfg.plausible || cfg.cloudflareToken);
  var consent = get("te_consent"); // "all" | "essential"
  var queue = [];
  function track(name, params) {
    params = params || {};
    var u = utm(); UTM_KEYS.forEach(function (k) { if (u[k]) params[k] = u[k]; });
    if (window.gtag) window.gtag("event", name, params);
    else if (window.plausible) window.plausible(name, { props: params });
    else queue.push([name, params]);
  }
  window.TETrack = track;
  function loadScript(src, attrs) {
    var s = document.createElement("script"); s.async = true; s.src = src;
    Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
  }
  function startAnalytics() {
    if (!hasAnalytics || window.__teAnalytics) return;
    window.__teAnalytics = true;
    if (cfg.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      var u = utm(), campaign = {};
      if (u.utm_source) campaign = { campaign_source: u.utm_source, campaign_medium: u.utm_medium, campaign_name: u.utm_campaign, campaign_term: u.utm_term, campaign_content: u.utm_content };
      window.gtag("config", cfg.ga4, Object.assign({ anonymize_ip: true }, campaign));
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4));
    } else if (cfg.plausible) {
      window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
      loadScript("https://plausible.io/js/script.tagged-events.js", { "data-domain": cfg.plausible });
    }
    if (cfg.cloudflareToken) loadScript("https://static.cloudflareinsights.com/beacon.min.js", { "data-cf-beacon": JSON.stringify({ token: cfg.cloudflareToken }) });
    queue.splice(0).forEach(function (ev) { track(ev[0], ev[1]); });
  }
  var banner = $("#cookie-banner");
  if (banner) {
    if (!consent && hasAnalytics) banner.hidden = false;
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-consent]");
      if (!b) return;
      consent = b.getAttribute("data-consent");
      set("te_consent", consent);
      banner.hidden = true;
      if (consent === "all") startAnalytics();
    });
  }
  if (consent === "all") startAnalytics();
  // "Cookie settings" links (e.g. in the footer / privacy page) reopen the banner
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-cookie-settings]")) { e.preventDefault(); if (banner) { banner.hidden = false; var b = $("button", banner); if (b) b.focus(); } }
  });
})();
