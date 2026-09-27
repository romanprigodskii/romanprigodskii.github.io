/* Zacks to Interactive Brokers: the daily run, drawn as a schematic.

   Not data: a drawing of the stages one run passes through and the
   interlocks that can stop it, in order. The client's screen, picks and
   account stay private, so the only numbers on it are the counts and limits
   the case states: 4,369 stocks in one day's screen, a book of 25 at 4% each,
   no order over 10% of the book, and a run that would sell more than 80% of
   what is held stops before it starts.

   Two drawings of the same run: across the tile on wide screens (runH), and
   down it on narrow ones (runV). Positions along the run are percentages, so
   the stages keep their places at any width while the type keeps its own
   size. Stages are rounded cards on the tile; the run is a line with a dot
   that travels it beneath the cards; the dry-run default is a switch that is on. Pre-rendered
   into the page by tools/figures.mjs as @zrH and @zrV;
   assets/js/zacks-ibkr.js sends one run through it when it comes into view.
   Solid lines are what runs today, in dry run; dashed lines are the
   connection to the account, which comes next. */
(function (root) {
  "use strict";

  var RX = 12;                                    // a stage card's corner
  function pc(f) { return (Math.round(f * 1e3) / 1e3) + "%"; }
  function T(x, y, s, cls, extra) { return '<text class="' + cls + '" x="' + x + '" y="' + y + '"' + (extra || "") + ">" + s + "</text>"; }
  function lines(x, y, arr, cls, lh, extra) { return arr.map(function (s, i) { return T(x, y + i * lh, s, cls, extra); }).join(""); }
  function L(x1, y1, x2, y2, cls, end) {
    return '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (end ? ' marker-end="url(#' + end + ')"' : "") + "/>";
  }
  function at(x, y, inner, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : "") + ' x="' + x + '" y="' + y + '" overflow="visible">' + inner + "</svg>"; }
  function defs(sfx) {
    function m(id, cls) {
      return '<marker id="' + id + sfx + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="' + cls + '" d="M1.5 1.5 L8.5 5 L1.5 8.5"/></marker>';
    }
    /* a card's lift: a hairline of shadow and a soft fall beneath it */
    var sh = '<filter id="zr-sh' + sfx + '" x="-20%" y="-30%" width="140%" height="190%" color-interpolation-filters="sRGB">' +
      '<feDropShadow dx="0" dy="1" stdDeviation="0.75" flood-color="#13161C" flood-opacity="0.05"/>' +
      '<feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#13161C" flood-opacity="0.06"/></filter>';
    return "<defs>" + m("zr-ms", "zr-as") + m("zr-md", "zr-ad") + sh + "</defs>";
  }
  /* the calendar starts every run */
  function clock(x, y) { return at(x, y, '<circle r="11"/><path d="M0 -5.5 V0 L4 2.4"/>', "zr-clock"); }
  /* the run's dot, parked where a run ends: just short of the switch */
  function token(x, y, axis) {
    return at(x, y, '<circle r="6" ' + (axis === "x" ? 'cx="-16"' : 'cy="-16"') + "/>", "zr-tok");
  }
  /* an interlock's lamp: a ring that fills and takes a tick when the run passes it */
  function lamp(x, y, i) {
    return at(x, y, '<g class="zr-lamp" data-lamp="' + i + '" transform="translate(24 0)"><circle r="8"/><path d="M-3.4 0.2 L-1 2.6 L3.6 -2.2"/></g>');
  }
  /* the dry-run switch, on: a track with its knob at the far end */
  function toggle(x, y, dx, dy) {
    return at(x, y, '<rect class="zr-tg-t" x="' + dx + '" y="' + dy + '" width="42" height="24" rx="12"/><circle class="zr-tg-k" cx="' + (dx + 30) + '" cy="' + (dy + 12) + '" r="9"/>', "zr-tg");
  }
  /* a stage of the run; data-lo/-hi/-c are its extent along the run, in the drawing's own units */
  function stage(o, sfx, inner) {
    var box = ' x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" rx="' + RX + '"';
    return '<g class="zr-st' + (o.cls ? " " + o.cls : "") + '" data-at="' + o.at + '" data-lo="' + o.lo + '" data-hi="' + o.hi + '" data-c="' + o.c + '">' +
      '<rect class="zr-ring"' + box + "/>" +
      '<rect class="zr-b"' + box + ' filter="url(#zr-sh' + sfx + ')"/>' + inner + "</g>";
  }
  function interlocks(o, sfx, lx) {
    var lt = o.y;
    return stage(o, sfx,
      T(lx, lt + 27, "Interlocks", "zr-k", ' dx="16"') +
      L(lx, lt + 41, o.r, lt + 41, "zr-rule") +
      lamp(lx, lt + 66, 0) + lamp(lx, lt + 104, 1) +
      lines(lx, lt + 63, ["No single order over", "10% of the book"], "zr-r", 15, ' dx="42"') +
      lines(lx, lt + 101, ["No run that sells over", "80% of what is held"], "zr-r", 15, ' dx="42"'));
  }
  function svgOpen(sfx, H, axis, cls) {
    return '<svg class="zr-svg ' + cls + '" width="100%" height="' + H + '" role="img" aria-labelledby="zr-t' + sfx + " zr-d" + sfx + '" data-axis="' + axis + '">' +
      '<title id="zr-t' + sfx + '">The daily run, as a schematic</title><desc id="zr-d' + sfx + '">' + DESC + "</desc>" + defs(sfx);
  }

  var DESC = "A schematic of one daily run, not data. Every trading day a Zacks screen export is collected on a VPS; one day's screen held 4,369 stocks. " +
    "It is parsed and validated, and a malformed export stops the run. It becomes an equal-weight target book of 25 positions, 4% each, " +
    "which is diffed against what the Interactive Brokers account holds; a surprising position stops the run. The difference is the orders that close the gap. " +
    "Then the interlocks: no single order may exceed 10% of the book, and a run that would sell more than 80% of what is held stops before it starts. " +
    "Last is the dry-run switch, on by default: nothing is sent to the account unless it is told to. So far it runs in dry run; the connection to the account comes next, on a paper account first.";

  /* ------------------------------------------------------------ across the tile */
  function runH() {
    var sfx = "-h", H = 318, M = 166, BH = 68, bt = M - BH / 2, bb = M + BH / 2, BUS = 292;
    var S = [
      { l: 3.6, r: 13.6, t: ["Zacks screen", "export"], n: ["4,369 stocks in", "one day’s screen"] },
      { l: 16.8, r: 26.8, t: ["Parse and", "validate"] },
      { l: 30.0, r: 40.0, t: ["Target book"], n: ["25 positions at", "equal weight,", "4% each"] },
      { l: 43.2, r: 53.2, t: ["Diff against", "the account"] },
      { l: 56.4, r: 64.4, t: ["Orders"], n: ["that close", "the gap"] },
      { l: 67.6, r: 85.0 }
    ];
    function c(i) { return (S[i].l + S[i].r) / 2; }
    var A = 88.4, AC = { l: 80, r: 100, t: 4, h: 84 }, UP = 98.6;
    var s = svgOpen(sfx, H, "x", "zr-h");

    // the connection to the account, next: dashed
    var rail = AC.t + AC.h / 2;
    s += '<g class="zr-next">';
    s += L(pc(AC.l), rail, pc(c(3)), rail, "zr-dl");
    s += L(pc(c(3)), rail, pc(c(3)), bt - 2, "zr-dl", "zr-md" + sfx);
    s += T(pc(c(3)), rail - 10, "what the account holds", "zr-x", ' dx="12"');
    s += L(pc(A), M, pc(UP), M, "zr-dl");
    s += L(pc(UP), M, pc(UP), AC.t + AC.h + 2, "zr-dl", "zr-md" + sfx);
    s += T(pc(UP), M - 10, "orders", "zr-x", ' dx="-10" text-anchor="end"');
    s += '<rect class="zr-acct" x="' + pc(AC.l) + '" y="' + AC.t + '" width="' + pc(AC.r - AC.l) + '" height="' + AC.h + '" rx="' + RX + '"/>';
    s += lines(pc(AC.l), AC.t + 29, ["Interactive Brokers", "account"], "zr-k is-next", 19, ' dx="16"');
    s += T(pc(AC.l), AC.t + 69, "connected next", "zr-n", ' dx="16"');
    s += "</g>";

    // the stop bus, and the three conditions that end a run
    var dL = 81.5, lt = M - 62, lh = 124;
    s += '<g class="zr-stop">';
    [{ x: c(1), t: ["a malformed", "export"], y: bb }, { x: c(3), t: ["a surprising", "position"], y: bb }, { x: dL, t: ["would sell over 80%", "of what is held"], y: lt + lh }].forEach(function (d) {
      s += L(pc(d.x), d.y, pc(d.x), BUS, "zr-xl");
      s += '<circle class="zr-jn" cx="' + pc(d.x) + '" cy="' + BUS + '" r="3"/>';
      s += lines(pc(d.x), d.y + 24, d.t, "zr-x", 15, ' dx="10"');
    });
    s += L(pc(c(1)), BUS, pc(87.4), BUS, "zr-xl", "zr-ms" + sfx);
    s += '<rect class="zr-term" x="' + pc(87.6) + '" y="' + (BUS - 17) + '" width="' + pc(12.4) + '" height="34" rx="17"/>';
    s += T(pc(93.8), BUS + 5, "The run stops", "zr-tk", ' text-anchor="middle"');
    s += "</g>";

    // the main line, pale, the run's trace over it, and the calendar that starts it
    s += L("24", M, pc(A), M, "zr-w");
    s += L("24", M, pc(A), M, "zr-tr");
    s += token(pc(A), M, "x");
    s += clock("11", M);
    s += T("0", bt - 18, "Every trading day, on a VPS", "zr-n");

    for (var i = 0; i < 5; i++) {
      var b = S[i], cx = pc(c(i));
      var inner = lines(cx, b.t.length === 2 ? M - 4 : M + 5.5, b.t, "zr-k", 19, ' text-anchor="middle"');
      if (b.n) inner += lines(cx, bb + 24, b.n, "zr-n", 15, ' text-anchor="middle"');
      s += stage({ at: i, lo: b.l, hi: b.r, c: c(i), x: pc(b.l), y: bt, w: pc(b.r - b.l), h: BH }, sfx, inner);
    }

    // the interlocks: one stage, two rows, a lamp each
    s += interlocks({ at: 5, lo: S[5].l, hi: S[5].r, c: c(5), x: pc(S[5].l), r: pc(S[5].r), y: lt, w: pc(S[5].r - S[5].l), h: lh, cls: "is-locks" }, sfx, pc(S[5].l));

    // the switch, on by default: nothing goes on to the account
    s += '<g class="zr-st is-sw" data-at="6" data-lo="' + A + '" data-hi="' + A + '" data-c="' + A + '">' +
      toggle(pc(A), M, 0, -12) +
      T(pc(A), M - 44, "Dry run", "zr-k") +
      T(pc(A), M - 27, "the default", "zr-n") + "</g>";
    s += '<g class="zr-out">' + lines(pc(A), M + 36, ["nothing is sent", "unless it is told to"], "zr-o", 15) + "</g>";

    return s + "</svg>";
  }

  /* ------------------------------------------------------------ down the tile */
  function runV() {
    var sfx = "-v", X = 34, BL = 4.5, BR = 63, BUS = 96;
    var bh = 52, gap = 32, y = 60;
    var S = [
      { t: "Zacks screen export", n: ["4,369 stocks in", "one day’s screen"] },
      { t: "Parse and validate", x: ["a malformed", "export"] },
      { t: "Target book", n: ["25 positions", "at equal weight,", "4% each"] },
      { t: "Diff against the account", x: ["a surprising", "position"] },
      { t: "Orders", n: ["that close", "the gap"] }
    ];
    S.forEach(function (b) { b.y = y; y += bh + gap; });
    var lt = y, lh = 124; y += lh + 44;
    var A = y, TG = 24; y = A + TG + 40;
    var acT = y, acH = 60; y += acH;
    var H = y + 40;
    var s = svgOpen(sfx, H, "y", "zr-v");

    // the connection to the account, next: dashed, up the left-hand side into the diff
    var dy = S[3].y + bh / 2, rail = 1.2, ay = acT + acH / 2;
    s += '<g class="zr-next">';
    s += L(pc(BL), ay, pc(rail), ay, "zr-dl");
    s += L(pc(rail), ay, pc(rail), dy, "zr-dl");
    s += L(pc(rail), dy, pc(BL), dy, "zr-dl", "zr-md" + sfx);
    s += L(pc(X), A + TG, pc(X), acT - 2, "zr-dl", "zr-md" + sfx);
    s += T(pc(X), A + TG + 25, "orders", "zr-x", ' dx="10"');
    s += '<rect class="zr-acct" x="' + pc(BL) + '" y="' + acT + '" width="' + pc(BR - BL) + '" height="' + acH + '" rx="' + RX + '"/>';
    s += lines(pc(X), acT + 26, ["Interactive Brokers", "account"], "zr-k is-next", 19, ' text-anchor="middle"');
    s += T(pc(BL), acT + acH + 24, "connected next, on a paper account first", "zr-n");
    s += "</g>";

    // the stop bus down the right-hand side
    var drops = [{ y: S[1].y + bh / 2, t: S[1].x }, { y: S[3].y + bh / 2, t: S[3].x }, { y: lt + 104, t: ["would sell", "over 80%"] }];
    s += '<g class="zr-stop">';
    drops.forEach(function (d) {
      s += L(pc(BR), d.y, pc(BUS), d.y, "zr-xl");
      s += '<circle class="zr-jn" cx="' + pc(BUS) + '" cy="' + d.y + '" r="3"/>';
      s += lines(pc(BR), d.y - 9 - (d.t.length - 1) * 15, d.t, "zr-x", 15, ' dx="10"');
    });
    s += L(pc(BUS), drops[0].y, pc(BUS), ay - 19, "zr-xl", "zr-ms" + sfx);
    s += '<rect class="zr-term" x="' + pc(BR + 3) + '" y="' + (ay - 17) + '" width="' + pc(100 - BR - 3) + '" height="34" rx="17"/>';
    s += T(pc((BR + 3 + 100) / 2), ay + 5, "The run stops", "zr-tk", ' text-anchor="middle"');
    s += "</g>";

    // the main line, the trace and the calendar
    s += L(pc(X), 31, pc(X), A, "zr-w");
    s += L(pc(X), 31, pc(X), A, "zr-tr");
    s += token(pc(X), A, "y");
    s += clock(pc(X), 18);
    s += T(pc(X), 22.5, "Every trading day, on a VPS", "zr-n", ' dx="20"');

    S.forEach(function (b, i) {
      var inner = T(pc(X), b.y + bh / 2 + 5.5, b.t, "zr-k", ' text-anchor="middle"');
      if (b.n) inner += lines(pc(BR), b.y + bh / 2 + 4 - (b.n.length - 1) * 7.5, b.n, "zr-n", 15, ' dx="12"');
      s += stage({ at: i, lo: b.y, hi: b.y + bh, c: b.y + bh / 2, x: pc(BL), y: b.y, w: pc(BR - BL), h: bh }, sfx, inner);
    });

    s += interlocks({ at: 5, lo: lt, hi: lt + lh, c: lt + lh / 2, x: pc(BL), r: pc(BR), y: lt, w: pc(BR - BL), h: lh, cls: "is-locks" }, sfx, pc(BL));

    // the switch, on
    s += '<g class="zr-st is-sw" data-at="6" data-lo="' + A + '" data-hi="' + (A + TG) + '" data-c="' + A + '">' +
      toggle(pc(X), A, -21, 0) +
      T(pc(X), A + 10, "Dry run", "zr-k", ' dx="-36" text-anchor="end"') +
      T(pc(X), A + 26, "the default", "zr-n", ' dx="-36" text-anchor="end"') + "</g>";
    s += '<g class="zr-out">' + lines(pc(X), A + 10, ["nothing is sent", "unless it is told to"], "zr-o", 15, ' dx="36"') + "</g>";

    return s + "</svg>";
  }

  var api = { runH: runH, runV: runV, markers: function () { return { zrH: runH, zrV: runV }; } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ZkRun = api;
})(this);
