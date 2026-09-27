/* Zacks to Interactive Brokers: the daily run, drawn as a schematic.

   Not data: a drawing of the stages one run passes through and the
   interlocks that can stop it, in order. The client's screen, picks and
   account stay private, so the only numbers on it are the counts and limits
   the case states: 4,369 stocks in one day's screen, a book of 25 at 4% each,
   no order over 10% of the book, and a run that would sell more than 80% of
   what is held stops before it starts.

   Two drawings of the same run: across the frame on wide screens (runH), and
   down the page on narrow ones (runV). Positions along the frame are
   percentages, so the stages keep their places at any width while the type
   keeps its own size. Pre-rendered into the page by tools/figures.mjs as
   @zrH and @zrV; assets/js/zacks-ibkr.js sends one run through it when it
   comes into view. Solid lines are what runs today, in dry run; dashed lines
   are the connection to the account, which comes next. */
(function (root) {
  "use strict";

  function pc(f) { return (Math.round(f * 1e3) / 1e3) + "%"; }
  function T(x, y, s, cls, extra) { return '<text class="' + cls + '" x="' + x + '" y="' + y + '"' + (extra || "") + ">" + s + "</text>"; }
  function lines(x, y, arr, cls, lh, extra) { return arr.map(function (s, i) { return T(x, y + i * lh, s, cls, extra); }).join(""); }
  function L(x1, y1, x2, y2, cls, end) {
    return '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (end ? ' marker-end="url(#' + end + ')"' : "") + "/>";
  }
  function at(x, y, inner, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : "") + ' x="' + x + '" y="' + y + '" overflow="visible">' + inner + "</svg>"; }
  function defs(sfx) {
    function m(id, cls, size) {
      return '<marker id="' + id + sfx + '" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="' + size + '" markerHeight="' + size + '" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="' + cls + '" d="M0 1 L10 5 L0 9 Z"/></marker>';
    }
    return "<defs>" + m("zr-ms", "zr-as", 8) + m("zr-md", "zr-ad", 8) + "</defs>";
  }
  /* the calendar starts every run */
  function clock(x, y) { return at(x, y, '<circle r="10"/><path d="M0 -6 V0 L4.5 2.6"/>', "zr-clock"); }
  /* a flow arrowhead where the line enters a stage: dir "r" or "d" */
  function inArrow(x, y, dir) { return at(x, y, dir === "d" ? '<path d="M-4.5 -8 L0 0 L4.5 -8 Z"/>' : '<path d="M-8 -4.5 L0 0 L-8 4.5 Z"/>', "zr-in"); }
  /* the run's token, parked where a run ends: just short of the open switch */
  function token(x, y, axis) {
    var px = axis === "x" ? -21.5 : -5.5, py = axis === "x" ? -5.5 : -21.5;
    return at(x, y, '<rect x="' + px + '" y="' + py + '" width="11" height="11" rx="1.5"/>', "zr-tok");
  }
  function lamp(x, y, i) { return at(x, y, '<circle class="zr-lamp" data-lamp="' + i + '" r="4"/>'); }
  /* a stage of the run; data-lo/-hi/-c are its extent along the run, in the drawing's own units */
  function stage(o, inner) {
    return '<g class="zr-st' + (o.cls ? " " + o.cls : "") + '" data-at="' + o.at + '" data-lo="' + o.lo + '" data-hi="' + o.hi + '" data-c="' + o.c + '">' +
      '<rect class="zr-b" x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" rx="2"/>' + inner + "</g>";
  }
  function svgOpen(sfx, H, axis, cls) {
    return '<svg class="zr-svg ' + cls + '" width="100%" height="' + H + '" role="img" aria-labelledby="zr-t' + sfx + " zr-d" + sfx + '" data-axis="' + axis + '">' +
      '<title id="zr-t' + sfx + '">The daily run, as a schematic</title><desc id="zr-d' + sfx + '">' + DESC + "</desc>" + defs(sfx);
  }

  var DESC = "A schematic of one daily run, not data. Every trading day a Zacks screen export is collected on a VPS; one day's screen held 4,369 stocks. " +
    "It is parsed and validated, and a malformed export stops the run. It becomes an equal-weight target book of 25 positions, 4% each, " +
    "which is diffed against what the Interactive Brokers account holds; a surprising position stops the run. The difference is the orders that close the gap. " +
    "Then the interlocks: no single order may exceed 10% of the book, and a run that would sell more than 80% of what is held stops before it starts. " +
    "Last is the dry-run switch, open by default: nothing is sent to the account unless it is told to. So far it runs in dry run; the connection to the account comes next, on a paper account first.";

  /* ------------------------------------------------------------ across the frame */
  function runH() {
    var sfx = "-h", H = 304, M = 152, BH = 64, bt = M - BH / 2, bb = M + BH / 2, BUS = 272;
    var S = [
      { l: 3.6, r: 13.6, t: ["Zacks screen", "export"], n: ["4,369 stocks in", "one day’s screen"] },
      { l: 17.0, r: 27.0, t: ["Parse and", "validate"] },
      { l: 30.4, r: 40.4, t: ["Target book"], n: ["25 positions, equal", "weight, 4% each"] },
      { l: 43.8, r: 53.8, t: ["Diff against", "the account"] },
      { l: 57.2, r: 65.2, t: ["Orders"], n: ["that close", "the gap"] },
      { l: 68.6, r: 84.6 }
    ];
    function c(i) { return (S[i].l + S[i].r) / 2; }
    var A = 88.2, B = 92.0, AC = { l: 82.2, r: 100, t: 4, h: 72 }, UP = 99.2;
    var s = svgOpen(sfx, H, "x", "zr-h");

    // the connection to the account, next: dashed
    var rail = AC.t + AC.h / 2;
    s += '<g class="zr-next">';
    s += L(pc(AC.l), rail, pc(c(3)), rail, "zr-dl");
    s += L(pc(c(3)), rail, pc(c(3)), bt - 1, "zr-dl", "zr-md" + sfx);
    s += T(pc(c(3)), rail - 9, "what the account holds", "zr-x", ' dx="10"');
    s += L(pc(B), M, pc(UP), M, "zr-dl");
    s += L(pc(UP), M, pc(UP), AC.t + AC.h + 1, "zr-dl", "zr-md" + sfx);
    s += T(pc(UP), AC.t + AC.h + 20, "orders", "zr-x", ' dx="-8" text-anchor="end"');
    s += '<rect class="zr-b is-acct" x="' + pc(AC.l) + '" y="' + AC.t + '" width="' + pc(AC.r - AC.l) + '" height="' + AC.h + '" rx="2"/>';
    s += T(pc(AC.l), AC.t + 25, "Interactive Brokers account", "zr-k", ' dx="12"');
    s += lines(pc(AC.l), AC.t + 45, ["connected next, on a", "paper account first"], "zr-n", 15, ' dx="12"');
    s += "</g>";

    // the stop bus, and the three conditions that end a run
    var dL = 80.6;
    s += '<g class="zr-stop">';
    [{ x: c(1), t: ["a malformed", "export"], y: bb }, { x: c(3), t: ["a surprising", "position"], y: bb }, { x: dL, t: ["would sell over 80%", "of what is held"], y: M + 58 }].forEach(function (d) {
      s += L(pc(d.x), d.y, pc(d.x), BUS, "zr-xl");
      s += '<circle class="zr-jn" cx="' + pc(d.x) + '" cy="' + BUS + '" r="2.5"/>';
      s += lines(pc(d.x), d.y + 24, d.t, "zr-x", 15, ' dx="9"');
    });
    s += L(pc(c(1)), BUS, pc(87.4), BUS, "zr-xl", "zr-ms" + sfx);
    s += '<rect class="zr-term" x="' + pc(87.6) + '" y="' + (BUS - 17) + '" width="' + pc(12.4) + '" height="34" rx="17"/>';
    s += T(pc(93.8), BUS + 5, "The run stops", "zr-tk", ' text-anchor="middle"');
    s += "</g>";

    // the main line, pale, the run's trace over it, and the calendar that starts it
    s += L("22", M, pc(A), M, "zr-w");
    s += L("22", M, pc(A), M, "zr-tr");
    s += token(pc(A), M, "x");
    s += clock("11", M);
    s += T("0", bt - 16, "Every trading day, on a VPS", "zr-n");

    for (var i = 0; i < 5; i++) {
      var b = S[i], cx = pc(c(i));
      var inner = lines(cx, b.t.length === 2 ? M - 4 : M + 6, b.t, "zr-k", 19, ' text-anchor="middle"');
      if (b.n) inner += lines(cx, bb + 24, b.n, "zr-n", 15, ' text-anchor="middle"');
      s += stage({ at: i, lo: b.l, hi: b.r, c: c(i), x: pc(b.l), y: bt, w: pc(b.r - b.l), h: BH }, inner + inArrow(pc(b.l), M, "r"));
    }

    // the interlocks: one stage, two rows, a lamp each
    var lt = M - 58, lh = 116, lx = pc(S[5].l);
    s += stage({ at: 5, lo: S[5].l, hi: S[5].r, c: c(5), x: lx, y: lt, w: pc(S[5].r - S[5].l), h: lh, cls: "is-locks" },
      T(lx, lt + 22, "Interlocks", "zr-k", ' dx="12"') +
      L(lx, lt + 33, pc(S[5].r), lt + 33, "zr-rule") +
      at(lx, 0, '<circle class="zr-lamp" data-lamp="0" cx="17" cy="' + (lt + 53) + '" r="4"/><circle class="zr-lamp" data-lamp="1" cx="17" cy="' + (lt + 91) + '" r="4"/>') +
      lines(lx, lt + 57, ["No single order over", "10% of the book"], "zr-r", 15, ' dx="29"') +
      lines(lx, lt + 95, ["No run that sells over", "80% of what is held"], "zr-r", 15, ' dx="29"') +
      inArrow(lx, M, "r"));

    // the switch, open by default: the blade pivots on the far contact, lifted clear of the near one
    s += '<g class="zr-st is-sw" data-at="6" data-lo="' + A + '" data-hi="' + B + '" data-c="' + A + '">' +
      at(pc(B), M, '<line class="zr-blade" x1="0" y1="0" x2="-33" y2="-19"/><circle class="zr-ct is-pivot" r="4"/>', "zr-knife") +
      at(pc(A), M, '<circle class="zr-ct" r="4"/>', "zr-knife") +
      T(pc(A), M - 42, "Dry run", "zr-k", ' dx="-6"') +
      T(pc(A), M - 26, "the default", "zr-n", ' dx="-6"') + "</g>";
    s += '<g class="zr-out">' + lines(pc(A), M + 26, ["nothing is sent", "unless it is told to"], "zr-o", 15, ' dx="-6"') + "</g>";

    return s + "</svg>";
  }

  /* ------------------------------------------------------------ down the page */
  function runV() {
    var sfx = "-v", X = 34, BL = 4.5, BR = 63, BUS = 96;
    var bh = 50, gap = 34, y = 58;
    var S = [
      { t: "Zacks screen export", n: ["4,369 stocks in", "one day’s screen"] },
      { t: "Parse and validate", x: ["a malformed", "export"] },
      { t: "Target book", n: ["25 positions", "at equal weight,", "4% each"] },
      { t: "Diff against the account", x: ["a surprising", "position"] },
      { t: "Orders", n: ["that close", "the gap"] }
    ];
    S.forEach(function (b) { b.y = y; y += bh + gap; });
    var lt = y, lh = 120; y += lh + 40;
    var A = y, B = y + 44; y = B + 36;
    var acT = y, acH = 50; y += acH;
    var H = y + 50;
    var s = svgOpen(sfx, H, "y", "zr-v");

    // the connection to the account, next: dashed, up the left-hand side into the diff
    var dy = S[3].y + bh / 2, rail = 1.2, ay = acT + acH / 2;
    s += '<g class="zr-next">';
    s += L(pc(BL), ay, pc(rail), ay, "zr-dl");
    s += L(pc(rail), ay, pc(rail), dy, "zr-dl");
    s += L(pc(rail), dy, pc(BL), dy, "zr-dl", "zr-md" + sfx);
    s += L(pc(X), B, pc(X), acT - 1, "zr-dl", "zr-md" + sfx);
    s += '<rect class="zr-b is-acct" x="' + pc(BL) + '" y="' + acT + '" width="' + pc(BR - BL) + '" height="' + acH + '" rx="2"/>';
    s += T(pc(X), acT + acH / 2 + 6, "Interactive Brokers account", "zr-k", ' text-anchor="middle"');
    s += lines(pc(BL), acT + acH + 22, ["connected next, on a paper account first"], "zr-n", 15);
    s += "</g>";

    // the stop bus down the right-hand side
    var drops = [{ y: S[1].y + bh / 2, t: S[1].x }, { y: S[3].y + bh / 2, t: S[3].x }, { y: lt + 96, t: ["would sell", "over 80%"] }];
    s += '<g class="zr-stop">';
    drops.forEach(function (d) {
      s += L(pc(BR), d.y, pc(BUS), d.y, "zr-xl");
      s += '<circle class="zr-jn" cx="' + pc(BUS) + '" cy="' + d.y + '" r="2.5"/>';
      s += lines(pc(BR), d.y - 8 - (d.t.length - 1) * 15, d.t, "zr-x", 15, ' dx="9"');
    });
    s += L(pc(BUS), drops[0].y, pc(BUS), ay - 18, "zr-xl", "zr-ms" + sfx);
    s += '<rect class="zr-term" x="' + pc(BR + 5) + '" y="' + (ay - 17) + '" width="' + pc(100 - BR - 5) + '" height="34" rx="17"/>';
    s += T(pc((BR + 5 + 100) / 2), ay + 5, "The run stops", "zr-tk", ' text-anchor="middle"');
    s += "</g>";

    // the main line, the trace and the calendar
    s += L(pc(X), 30, pc(X), A, "zr-w");
    s += L(pc(X), 30, pc(X), A, "zr-tr");
    s += token(pc(X), A, "y");
    s += clock(pc(X), 18);
    s += T(pc(X), 22, "Every trading day, on a VPS", "zr-n", ' dx="18"');

    S.forEach(function (b, i) {
      var inner = T(pc(X), b.y + bh / 2 + 6, b.t, "zr-k", ' text-anchor="middle"');
      if (b.n) inner += lines(pc(BR), b.y + bh / 2 + 4 - (b.n.length - 1) * 7.5, b.n, "zr-n", 15, ' dx="10"');
      s += stage({ at: i, lo: b.y, hi: b.y + bh, c: b.y + bh / 2, x: pc(BL), y: b.y, w: pc(BR - BL), h: bh }, inner + inArrow(pc(X), b.y, "d"));
    });

    var lx = pc(BL);
    s += stage({ at: 5, lo: lt, hi: lt + lh, c: lt + lh / 2, x: lx, y: lt, w: pc(BR - BL), h: lh, cls: "is-locks" },
      T(lx, lt + 22, "Interlocks", "zr-k", ' dx="12"') +
      L(lx, lt + 33, pc(BR), lt + 33, "zr-rule") +
      at(lx, 0, '<circle class="zr-lamp" data-lamp="0" cx="17" cy="' + (lt + 53) + '" r="4"/><circle class="zr-lamp" data-lamp="1" cx="17" cy="' + (lt + 91) + '" r="4"/>') +
      lines(lx, lt + 57, ["No single order over", "10% of the book"], "zr-r", 15, ' dx="29"') +
      lines(lx, lt + 95, ["No run that sells over", "80% of what is held"], "zr-r", 15, ' dx="29"') +
      inArrow(pc(X), lt, "d"));

    // the switch, open
    s += '<g class="zr-st is-sw" data-at="6" data-lo="' + A + '" data-hi="' + B + '" data-c="' + A + '">' +
      at(pc(X), B, '<line class="zr-blade" x1="0" y1="0" x2="20" y2="-36"/><circle class="zr-ct is-pivot" r="4"/>', "zr-knife") +
      at(pc(X), A, '<circle class="zr-ct" r="4"/>', "zr-knife") +
      T(pc(X), A + 10, "Dry run", "zr-k", ' dx="-16" text-anchor="end"') +
      T(pc(X), A + 26, "the default", "zr-n", ' dx="-16" text-anchor="end"') + "</g>";
    s += '<g class="zr-out">' + lines(pc(X), A + 14, ["nothing is sent", "unless it is told to"], "zr-o", 15, ' dx="34"') + "</g>";

    return s + "</svg>";
  }

  var api = { runH: runH, runV: runV, markers: function () { return { zrH: runH, zrV: runV }; } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ZkRun = api;
})(this);
