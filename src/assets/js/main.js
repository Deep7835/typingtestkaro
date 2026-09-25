/* TypingTestKaro — site-wide behaviour: navigation, theme, filters, saved progress. */
(function () {
  "use strict";

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var toggle = document.querySelector(".theme-toggle");
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("te_theme", next); } catch (e) {}
    });
    // make the icon match the system theme on first load
    if (!root.getAttribute("data-theme")) root.setAttribute("data-theme", currentTheme());
  }

  /* ---------- mobile menu & dropdowns ---------- */
  var menuBtn = document.querySelector(".menu-toggle");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var ddButtons = document.querySelectorAll(".main-nav .nav-link[aria-controls]");
  function closeAll(except) {
    [].forEach.call(ddButtons, function (b) {
      if (b === except) return;
      b.setAttribute("aria-expanded", "false");
      b.parentElement.classList.remove("open");
    });
  }
  [].forEach.call(ddButtons, function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var li = btn.parentElement, open = !li.classList.contains("open");
      closeAll(btn);
      li.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".main-nav")) closeAll();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeAll(); document.body.classList.remove("nav-open"); }
  });

  /* ---------- footer year ---------- */
  [].forEach.call(document.querySelectorAll("[data-year]"), function (n) { n.textContent = new Date().getFullYear(); });

  /* ---------- chip filters (exams & blog) ---------- */
  function chipFilter(wrapId, itemsSelector, attr) {
    var wrap = document.getElementById(wrapId);
    if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-cat]");
      if (!chip) return;
      [].forEach.call(wrap.querySelectorAll(".chip"), function (c) { c.classList.toggle("active", c === chip); });
      var cat = chip.getAttribute("data-cat");
      [].forEach.call(document.querySelectorAll(itemsSelector), function (n) {
        n.classList.toggle("hide", cat !== "all" && n.getAttribute(attr) !== cat);
      });
    });
  }
  chipFilter("blog-cats", "#blog-grid .post-card", "data-category");
  chipFilter("exam-cats", ".exam-group", "data-cat");

  var search = document.getElementById("exam-search");
  if (search) {
    var params = new URLSearchParams(location.search);
    if (params.get("q")) search.value = params.get("q");
    var run = function () {
      var q = search.value.trim().toLowerCase(), any = false;
      [].forEach.call(document.querySelectorAll(".exam-group"), function (g) {
        var shown = 0;
        [].forEach.call(g.querySelectorAll(".exam-card"), function (c) {
          var hit = !q || (c.getAttribute("data-name") || "").indexOf(q) !== -1;
          c.classList.toggle("hide", !hit);
          if (hit) shown++;
        });
        g.classList.toggle("hide", !shown);
        if (shown) any = true;
      });
      var empty = document.getElementById("exam-empty");
      if (empty) empty.hidden = any;
    };
    search.addEventListener("input", run);
    if (search.value) run();
  }

  /* ---------- course progress (stars on lesson list) ---------- */
  var rows = document.querySelectorAll("[data-lesson]");
  if (rows.length) {
    var done = 0, firstOpen = null, course = null;
    [].forEach.call(rows, function (row) {
      var id = row.getAttribute("data-lesson"), p = store("te_lesson_" + id);
      course = id.split(":")[0];
      if (p && p.stars) {
        done++;
        row.classList.add("completed");
        row.querySelector(".lesson-stars").textContent = "★★★".slice(0, p.stars) + "☆☆☆".slice(0, 3 - p.stars);
      } else if (!firstOpen) firstOpen = row;
    });
    var prog = document.querySelector("[data-course-progress]");
    if (prog) prog.textContent = done ? done + " of " + prog.getAttribute("data-total") + " lessons completed" : "";
    var cont = document.querySelector("[data-continue]");
    if (cont && done && firstOpen) {
      cont.href = firstOpen.getAttribute("href");
      cont.textContent = "Continue: lesson " + firstOpen.querySelector(".lesson-num").textContent + " →";
    }
  }

  /* ---------- small keyboard preview on course pages ---------- */
  var ckb = document.querySelector("[data-kb-layout]");
  if (ckb) {
    var draw = function () {
      if (window.TE && window.TE.Keyboard) new window.TE.Keyboard(ckb, ckb.getAttribute("data-kb-layout"));
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", draw); else draw();
  }
})();

/* Offline support: cache pages and assets after the first visit. */
(function () {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
})();

/* Blog archive search */
(function () {
  var input = document.getElementById("archive-search");
  if (!input) return;
  var items = document.querySelectorAll(".arch-item"), count = document.getElementById("archive-count"), empty = document.getElementById("archive-empty");
  input.addEventListener("input", function () {
    var q = input.value.trim().toLowerCase(), shown = 0;
    [].forEach.call(items, function (li) {
      var hit = !q || li.getAttribute("data-text").indexOf(q) !== -1;
      li.hidden = !hit; if (hit) shown++;
    });
    [].forEach.call(document.querySelectorAll(".arch-month"), function (m) { m.hidden = !m.querySelector(".arch-item:not([hidden])"); });
    count.textContent = shown + (shown === 1 ? " article" : " articles");
    empty.hidden = shown > 0;
  });
})();
