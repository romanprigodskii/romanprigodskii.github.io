/* /work/indelible/: behaviour for this case only.
   - "Check backwards, in writing": question 4 of a printed recheck takes an
     answer in its box, and its check line runs the check backwards from it:
     3 × x + 5, against 20. When the question first comes into view it answers
     itself once, wrongly (15) and then rightly (5), unless the reader has
     already typed; after that it is the reader's.
   The ladder and the three rules are drawn by CSS when they arrive (site.js
   adds .in). Everything reads correctly without this file: the picture of
   the question stays as printed. */
(function () {
  "use strict";
  var RP = window.RP;
  if (!RP) return;

  var q = document.querySelector("[data-q]");
  if (!q) return;
  var box = q.querySelector(".inc-q-box"), x = q.querySelector("[data-q-x]"), line = q.querySelector("[data-q-check]");
  var hint = document.querySelector("[data-q-hint]");
  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="q-mark" pathLength="1" d="M4 12.5l5 5L20 6.5"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="q-mark" pathLength="1" d="M6 6l12 12M18 6L6 18"/></svg>';

  function num(s) {
    s = String(s).trim().replace(/−/g, "-").replace(",", ".").replace(/^x\s*=\s*/i, "");
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return parseFloat(s);
  }
  function fmt(n) {
    var r = Math.round(n * 100) / 100;
    return (r < 0 ? "−" : "") + String(Math.abs(r));
  }
  function show() {
    var v = x.value, n = num(v);
    line.classList.remove("is-no", "is-yes", "is-wait");
    if (!v.trim()) {
      line.classList.add("is-wait");
      line.innerHTML = "3 × x + 5 = ?";
      return;
    }
    if (isNaN(n)) {
      line.classList.add("is-wait");
      line.innerHTML = "a number, then its check";
      return;
    }
    var back = 3 * n + 5, holds = Math.abs(back - 20) < 0.005;
    line.classList.add(holds ? "is-yes" : "is-no");
    line.innerHTML = "<span>3 × " + fmt(n) + " + 5 = " + fmt(back) + "</span>" + (holds ? TICK : CROSS) +
      '<span class="q-say">' + (holds ? "it holds" : "not 20: look again") + "</span>";
  }

  box.hidden = false;
  line.hidden = false;
  if (hint) hint.hidden = false;
  x.placeholder = "type x";
  show();

  var touched = false, timers = [];
  function stop() { touched = true; timers.forEach(clearTimeout); timers = []; }
  x.addEventListener("input", function () { stop(); show(); });
  x.addEventListener("pointerdown", stop);
  x.addEventListener("keydown", stop);

  /* the question answers itself once, the first time it is seen */
  function type(s, at) {
    for (var i = 0; i <= s.length; i++) (function (k) {
      timers.push(setTimeout(function () { if (!touched) { x.value = s.slice(0, k); show(); } }, at + k * 170));
    })(i);
    return at + s.length * 170;
  }
  if (!RP.still()) {
    var stage = q.closest("[data-shot]") || q;
    var ran = false;
    var demo = function () {
      if (ran || touched) return;
      ran = true;
      var t = type("15", 900);
      t = type("", t + 2600);
      type("5", t + 500);
    };
    RP.watch(stage, demo);
    if (stage.classList.contains("in")) demo();
  }
})();
