/* TypingTestKaro — keyboard quiz. Questions come from window.TE_QUIZ. */
(function () {
  "use strict";
  var root = document.getElementById("quiz");
  var all = window.TE_QUIZ || [];
  if (!root || !all.length) return;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var topics = ["All"].concat(all.map(function (q) { return q.topic; }).filter(function (t, i, a) { return a.indexOf(t) === i; }));
  var qs, i, score, answers;

  function start(topic, count) {
    qs = shuffle(all.filter(function (q) { return topic === "All" || q.topic === topic; })).slice(0, count);
    i = 0; score = 0; answers = [];
    show();
  }

  function intro() {
    var best = null;
    try { best = JSON.parse(localStorage.getItem("te_quiz_best")); } catch (e) {}
    root.innerHTML = '<div class="card quiz-card center">' +
      '<div class="game-emoji" aria-hidden="true">🧠</div><h2>Keyboard &amp; Typing Quiz</h2>' +
      '<p class="muted">' + all.length + " questions on keys, shortcuts, typing tests and Hindi layouts. Test your keyboard knowledge.</p>" +
      '<div class="row mt-2" style="justify-content:center"><label class="tt-field" style="max-width:220px"><span>Topic</span><select class="input" id="qz-topic">' +
      topics.map(function (t) { return "<option>" + esc(t) + "</option>"; }).join("") + '</select></label>' +
      '<label class="tt-field" style="max-width:160px"><span>Questions</span><select class="input" id="qz-count"><option>10</option><option selected>20</option><option value="999">All</option></select></label></div>' +
      '<button class="btn btn-primary btn-lg mt-3" type="button" id="qz-go">Start quiz</button>' +
      (best ? '<p class="muted mt-2">Your best: ' + best.score + " / " + best.total + "</p>" : "") + "</div>";
    document.getElementById("qz-go").addEventListener("click", function () {
      start(document.getElementById("qz-topic").value, parseInt(document.getElementById("qz-count").value, 10));
    });
  }

  function show() {
    var q = qs[i];
    root.innerHTML = '<div class="card quiz-card">' +
      '<div class="row" style="justify-content:space-between"><span class="badge badge-primary">Question ' + (i + 1) + " of " + qs.length + '</span><span class="badge">' + esc(q.topic) + '</span><span class="badge badge-success">Score ' + score + "</span></div>" +
      '<div class="tt-prog mt-2"><i style="width:' + (i / qs.length * 100) + '%"></i></div>' +
      '<h2 class="quiz-q">' + esc(q.q) + "</h2>" +
      '<div class="quiz-options">' + q.options.map(function (o, k) {
        return '<button type="button" class="quiz-opt" data-k="' + k + '"><span class="quiz-letter">' + "ABCD"[k] + "</span>" + esc(o) + "</button>";
      }).join("") + "</div>" +
      '<div class="quiz-explain hide" id="qz-exp"></div>' +
      '<div class="row mt-2" style="justify-content:flex-end"><button class="btn btn-primary hide" type="button" id="qz-next">' + (i + 1 < qs.length ? "Next question →" : "See result") + "</button></div></div>";
    [].forEach.call(root.querySelectorAll(".quiz-opt"), function (b) {
      b.addEventListener("click", function () { choose(parseInt(b.getAttribute("data-k"), 10)); });
    });
    document.getElementById("qz-next").addEventListener("click", function () { i++; if (i < qs.length) show(); else result(); });
  }

  function choose(k) {
    var q = qs[i], btns = root.querySelectorAll(".quiz-opt");
    if (btns[0].disabled) return;
    [].forEach.call(btns, function (b, n) {
      b.disabled = true;
      if (n === q.answer) b.classList.add("right");
      else if (n === k) b.classList.add("wrong");
    });
    var ok = k === q.answer;
    if (ok) score++;
    answers.push({ q: q, k: k });
    var exp = document.getElementById("qz-exp");
    exp.innerHTML = "<strong>" + (ok ? "✓ Correct!" : "✗ Not quite.") + "</strong> " + esc(q.explain);
    exp.className = "quiz-explain callout " + (ok ? "success" : "warn");
    var next = document.getElementById("qz-next");
    next.classList.remove("hide");
    next.focus();
  }

  function result() {
    var pct = Math.round(score / qs.length * 100);
    try {
      var best = JSON.parse(localStorage.getItem("te_quiz_best"));
      if (!best || pct > best.score / best.total * 100) localStorage.setItem("te_quiz_best", JSON.stringify({ score: score, total: qs.length }));
    } catch (e) {}
    var wrong = answers.filter(function (a) { return a.k !== a.q.answer; });
    root.innerHTML = '<div class="card quiz-card center"><div class="game-emoji" aria-hidden="true">' + (pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚") + "</div>" +
      "<h2>You scored " + score + " / " + qs.length + " (" + pct + "%)</h2>" +
      '<p class="muted">' + (pct >= 80 ? "Keyboard expert! Now put it to work in a typing test." : pct >= 50 ? "Good knowledge — review the answers below." : "Keep learning — the explanations below will help.") + "</p>" +
      '<div class="row mt-2" style="justify-content:center"><button class="btn btn-primary" type="button" id="qz-again">Play again</button><a class="btn btn-outline" href="/typing-test/">Take a typing test</a></div>' +
      (wrong.length ? '<div class="quiz-review mt-3" style="text-align:left"><h3>Review your mistakes</h3>' + wrong.map(function (a) {
        return '<div class="quiz-rev"><b>' + esc(a.q.q) + '</b><br><span class="muted">Your answer: ' + esc(a.q.options[a.k]) + '</span><br><span style="color:var(--success)">Correct: ' + esc(a.q.options[a.q.answer]) + "</span><br><small class=\"muted\">" + esc(a.q.explain) + "</small></div>";
      }).join("") + "</div>" : "") + "</div>";
    document.getElementById("qz-again").addEventListener("click", intro);
  }

  intro();
})();
