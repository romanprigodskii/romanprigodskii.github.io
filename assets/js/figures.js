/* Figures for prigodskii.dev.

   Pure functions that return SVG strings. The same code draws the figures in
   the browser and pre-renders them into the HTML for readers without
   JavaScript (node tools/figures.mjs), so a page is complete before any
   script runs.

   The page grid is a logarithmic e-value axis from 0.01 to 1,680: every
   vertical line behind every page sits at m x 10^k on that axis. 20 is the bar
   for one pre-registered hypothesis, 1,680 the bar for all 84 at once. Every
   e-value figure on the site is drawn on that same axis, so its ticks land on
   the page's own lines.

   Data comes from assets/data/audit.json (generated from the papers by
   tools/build_data.py) and assets/data/boxing.json (copied from the Vertex
   Boxing report, section by section). Nothing here is invented. */
(function (root) {
  "use strict";

  var L = Math.log10 || function (v) { return Math.log(v) / Math.LN10; };
  var GRID = { lo: 0.01, hi: 1680 };
  var SPAN = L(GRID.hi) - L(GRID.lo);

  /* ------------------------------------------------------------ helpers */
  function gx(v) { return (L(v) - L(GRID.lo)) / SPAN; }            // e-value -> 0..1 across the frame
  function pc(f) { return (Math.round(f * 1e5) / 1e3) + "%"; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function fmtInt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function fmtE(v) {
    if (v < 0.01) return "under 0.01";
    if (v < 10) return v.toFixed(2);
    if (v < 100) return v.toFixed(1);
    return fmtInt(v);
  }
  function fmtAxis(v) { return v >= 1000 ? fmtInt(v) : String(v); }
  function minus(v, d) { return (v < 0 ? "−" : "") + Math.abs(v).toFixed(d); }
  function signed(v, d) { return (v < 0 ? "−" : "+") + Math.abs(v).toFixed(d); }

  /* every line of the page grid: m x 10^k up to 1,680 */
  function gridValues() {
    var out = [];
    for (var k = -2; k <= 3; k++) {
      for (var m = 1; m <= 9; m++) {
        var v = +(m * Math.pow(10, k)).toPrecision(3);
        if (v > GRID.hi) break;
        out.push({ v: v, m: m, k: k });
      }
    }
    out.push({ v: GRID.hi, m: 0, k: 3, end: true });
    return out;
  }
  function gridClass(g) {
    if (g.end) return "ge";          // 1,680, the bar for all 84
    if (g.v === 20) return "gb";     // 20, the bar for one
    if (g.v === 1) return "g1";      // e = 1, a bet that broke even
    if (g.m === 1) return "gd";      // decades
    if (g.m === 2 || g.m === 5) return "gh";
    return "gn";
  }

  /* ------------------------------------------------------------ 1. the page grid
     One SVG with every line classed; the stylesheet decides which classes show
     where (all of them in a hero, only the decades behind prose). */
  function grid() {
    var s = '<svg class="gp-svg" width="100%" height="100%" preserveAspectRatio="none" focusable="false" aria-hidden="true">';
    gridValues().forEach(function (g) {
      var x = pc(gx(g.v));
      s += '<line class="' + gridClass(g) + '" x1="' + x + '" x2="' + x + '" y1="0" y2="100%"/>';
    });
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ 2. a ruler edge
     Drawn along the top of each section: the page's scale, graduated. */
  function edge() {
    var s = '<svg class="edge-svg" width="100%" height="16" focusable="false" aria-hidden="true">' +
      '<line class="edge-base" x1="0" x2="100%" y1="0.5" y2="0.5"/>';
    var i = 0;
    gridValues().forEach(function (g) {
      var c = gridClass(g);
      var len = (c === "gd" || c === "g1" || c === "ge" || g.v === 0.01) ? 14 : (c === "gb" || c === "gh") ? 8 : 4;
      s += '<line class="edge-t ' + c + '" style="--i:' + (i++) + '" x1="' + pc(gx(g.v)) + '" x2="' + pc(gx(g.v)) + '" y1="0.5" y2="' + (len + 0.5) + '"/>';
    });
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ 3. the slide rule
     The stock (D) runs 1..1,680; the slide (C) runs 1..84 at the same unit, so
     with the slide's 1 set under 20, the cursor over 84 reads 1,680: the bar
     for 84 hypotheses at once is 20 x 84. */
  var RULE = { dHi: 1680, cHi: 84 };
  function dx(v) { return L(v) / L(RULE.dHi); }
  function cx(k) { return L(k) / L(RULE.cHi); }
  var TLEN = { tD: 26, tM: 19, th: 13, tn: 8, tu: 5, tE: 30 };

  function dTicks() {
    var t = [];
    function add(v, c) { if (v <= RULE.dHi + 1e-9) t.push({ v: v, c: c }); }
    for (var k = 0; k <= 3; k++) {
      var p = Math.pow(10, k);
      for (var a = 1; a <= 9; a++) {
        if (a * p > RULE.dHi) break;
        add(a * p, a === 1 ? "tD" : "tM");
        var steps = a === 1 ? [[0.05, "tu"], [0.1, "tn"], [0.5, "th"]] : a < 4 ? [[0.1, "tn"], [0.5, "th"]] : [[0.1, "tu"], [0.5, "th"]];
        var seen = {};
        steps.slice().reverse().forEach(function (st) {
          for (var f = st[0]; f < 0.999; f += st[0]) {
            var key = Math.round(f * 1000);
            if (seen[key]) continue;
            seen[key] = 1;
            add(+((a + f) * p).toPrecision(4), st[1]);
          }
        });
      }
    }
    return t;
  }

  function ruleD() {
    var H = 60;
    var s = '<svg class="sc sc-d" width="100%" height="' + H + '" focusable="false" aria-hidden="true">';
    dTicks().forEach(function (t) {
      var x = pc(dx(t.v));
      s += '<line class="' + t.c + '" x1="' + x + '" x2="' + x + '" y1="' + (H - TLEN[t.c]) + '" y2="' + H + '"/>';
    });
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900].forEach(function (v) {
      var dec = v === 1 || v === 10 || v === 100;
      var major = /^[25]/.test(String(v));
      var cls = dec ? "nD" : v === 20 ? "nB" : major ? "nM" : "nS";
      var label = v >= 10 && !dec ? String(v).charAt(0) : fmtAxis(v);
      s += '<text class="' + cls + (v === 1 ? " is-first" : "") + '" x="' + pc(dx(v)) + '" y="' + (H - (dec ? 31 : 24)) + '">' + label + "</text>";
    });
    s += '<line class="tE" x1="100%" x2="100%" y1="' + (H - TLEN.tE) + '" y2="' + H + '"/>';
    s += '<text class="nE" x="100%" dx="-36" y="' + (H - 34) + '">1,680</text>';
    return s + "</svg>";
  }

  function ruleC() {
    var H = 48;
    var s = '<svg class="sc sc-c" width="100%" height="' + H + '" focusable="false" aria-hidden="true">';
    for (var k = 1; k <= RULE.cHi; k++) {
      var cls;
      if (k === 1 || k === 10 || k === RULE.cHi) cls = "tD";
      else if (k < 10 || k % 10 === 0) cls = "tM";
      else if (k % 5 === 0) cls = "th";
      else if (k < 30) cls = "tn";
      else if (k % 2 === 0 && k < 50) cls = "tu";
      else continue;
      var x = pc(cx(k));
      s += '<line class="' + cls + '" x1="' + x + '" x2="' + x + '" y1="0" y2="' + TLEN[cls] + '"/>';
    }
    [1.5, 2.5].forEach(function (h) { s += '<line class="tu" x1="' + pc(cx(h)) + '" x2="' + pc(cx(h)) + '" y1="0" y2="' + TLEN.tu + '"/>'; });
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 84].forEach(function (k) {
      var cls = k === 1 || k === 10 ? "nD" : k === 84 ? "nE" : [2, 5, 20].indexOf(k) >= 0 ? "nM" : "nS";
      s += '<text class="' + cls + (k === 1 ? " is-first" : "") + '" x="' + pc(cx(k)) + '"' + (k === 84 ? ' dx="-34"' : "") + ' y="' + (k === 1 || k === 10 || k === 84 ? 44 : 38) + '">' + k + "</text>";
    });
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ 4. the 84, on the page's axis
     A Wilkinson dot plot: each hypothesis settles on the lowest free level at
     its e-value. Values under 0.01 are off this scale; on a wide page they
     stack in the margin left of the axis, on a phone they are a count. */
  function verdictLayout(rows, key, W) {
    var wide = W > 700;
    var r = wide ? 5.5 : 3.4, gap = wide ? 1.8 : 1.2, d = 2 * r + gap;
    var pts = rows.map(function (row, i) { return { i: i, v: row[key] }; });
    var on = pts.filter(function (p) { return p.v > GRID.lo; }).sort(function (a, b) { return a.v - b.v; });
    var off = pts.filter(function (p) { return p.v <= GRID.lo; });
    var levels = [];
    on.forEach(function (p) {
      p.x = gx(p.v) * W;
      for (var lv = 0; ; lv++) {
        var row = levels[lv] || (levels[lv] = []);
        var clash = false;
        for (var j = 0; j < row.length; j++) if (Math.abs(row[j] - p.x) < d) { clash = true; break; }
        if (!clash) { row.push(p.x); p.lv = lv; break; }
      }
    });
    var cols = 3;
    off.forEach(function (p, j) {
      p.off = true;
      if (wide) { p.x = -(r + 4) - (j % cols) * d; p.lv = Math.floor(j / cols); }
      else { p.x = -1000; p.lv = 0; }           // counted, not drawn
    });
    var maxLv = 0;
    pts.forEach(function (p) { if (!p.off || wide) maxLv = Math.max(maxLv, p.lv); });
    return { pts: pts, r: r, d: d, maxLv: maxLv, nOff: off.length, wide: wide };
  }

  /* opts.bar: 20 (one hypothesis) or 1680 (all 84 at once) */
  function verdict(rows, W, key, opts) {
    opts = opts || {};
    key = key || "ef";
    var bar = opts.bar || 20, sfx = opts.sfx || "";
    var lay = verdictLayout(rows, key, W);
    var other = verdictLayout(rows, key === "ef" ? "er" : "ef", W);
    var top = 62, stackH = (Math.max(lay.maxLv, other.maxLv) + 1) * lay.d + 8;
    var y0 = top + stackH, H = y0 + (lay.wide ? 54 : 60), wide = lay.wide;
    var best = 0;
    rows.forEach(function (r) { if (r[key] > best) best = r[key]; });
    var s = '<svg class="vd-svg" viewBox="0 0 ' + r2(W) + " " + H + '" width="100%" height="' + H + '" data-y0="' + y0 + '" data-w="' + r2(W) + '" overflow="visible" role="img" aria-labelledby="vd-t' + sfx + ' vd-d' + sfx + '">' +
      '<title id="vd-t' + sfx + '">The 84 pre-registered hypotheses, by e-value</title>' +
      '<desc id="vd-d' + sfx + '">Each mark is one hypothesis on a logarithmic e-value axis from 0.01 to 1,680. At fair odds six reach 20, the bar for a single hypothesis; after the bookmaker\'s margin one does, on the most favourable of five seeds. None reaches 1,680, the bar for all 84 at once. The best reaches 151.</desc>' +
      '<defs><pattern id="vd-h' + sfx + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="vd-hl"/></pattern></defs>';
    // the gap between the best mark and the bar for all 84, hatched: what nothing reached
    var xb = r2(gx(best) * W), xe = r2(W);
    s += '<rect class="vd-gap" x="' + xb + '" y="' + (top - 4) + '" width="' + r2(xe - xb) + '" height="' + (y0 - top + 4) + '" fill="url(#vd-h' + sfx + ')"/>';
    s += '<line class="vd-best" x1="' + xb + '" x2="' + xb + '" y1="' + (top - 4) + '" y2="' + y0 + '"/>';
    s += '<text class="vd-bestcap" x="' + xb + '" y="' + (top + 14) + '" dx="7">' + (wide ? "the best of the 84: " : "best: ") + fmtE(best) + "</text>";
    // decade and threshold lines
    gridValues().forEach(function (g) {
      var c = gridClass(g);
      if (c === "gn" || c === "gh" || c === "gb") return;
      var x = r2(gx(g.v) * W);
      s += '<line class="vd-' + c + '" x1="' + x + '" x2="' + x + '" y1="' + (c === "ge" ? 28 : top) + '" y2="' + (y0 + 10) + '"/>';
    });
    // the bar in force, and the ghost of 20 when the bar is raised
    var xbar = r2(gx(bar) * W), x20 = r2(gx(20) * W);
    if (bar !== 20) s += '<line class="vd-ghost" x1="' + x20 + '" x2="' + x20 + '" y1="28" y2="' + (y0 + 6) + '"/>';
    s += '<line class="vd-bar" data-vd-bar x1="' + xbar + '" x2="' + xbar + '" y1="28" y2="' + (y0 + 6) + '"/>';
    // the axis and minor graduations
    s += '<line class="vd-axis" x1="0" x2="' + r2(W) + '" y1="' + y0 + '" y2="' + y0 + '"/>';
    gridValues().forEach(function (g) {
      var c = gridClass(g);
      if (c !== "gn" && c !== "gh" && c !== "gb") return;
      var x = r2(gx(g.v) * W);
      s += '<line class="vd-tk" x1="' + x + '" x2="' + x + '" y1="' + y0 + '" y2="' + (y0 + (c === "gn" ? 4 : 7)) + '"/>';
    });
    (wide ? [0.01, 0.1, 1, 10, 100] : [0.1, 1, 10, 100]).forEach(function (v) {
      s += '<text class="vd-n' + (v === 0.01 ? " is-first" : "") + '" x="' + r2(gx(v) * W) + '" y="' + (y0 + 28) + '">' + fmtAxis(v) + "</text>";
    });
    s += '<text class="vd-n is-bar" x="' + x20 + '" y="' + (y0 + 28) + '">20</text>';
    s += '<text class="vd-n is-bar is-end" x="' + r2(W) + '" y="' + (y0 + 28) + '">1,680</text>';
    if (lay.nOff) {
      if (wide) s += '<text class="vd-off" x="-4" y="' + (y0 + 22) + '">under</text><text class="vd-off" x="-4" y="' + (y0 + 36) + '">0.01</text>';
      else s += '<text class="vd-off is-count" x="0" y="' + (y0 + 46) + '">← ' + lay.nOff + " more under 0.01, off the scale</text>";
    }
    // captions on the two bars
    if (wide) {
      var roomy = W > 1110;
      s += '<text class="vd-cap" data-vd-barcap x="' + r2(Math.min(xbar + 8, W - 8)) + '" y="40"' + (bar === 20 ? "" : ' text-anchor="end" dx="-16"') + ">" + (bar === 20 ? (roomy ? "20, the bar for one hypothesis" : "the bar for one") : "") + "</text>";
      s += '<text class="vd-cap is-end" x="' + r2(W - 8) + '" y="40">' + (roomy ? "1,680, the bar for all 84 at once" : "for all 84 at once") + "</text>";
    } else {
      s += '<text class="vd-cap is-end" x="' + r2(x20 - 6) + '" y="40">bar for one</text>';
      s += '<text class="vd-cap is-end" x="' + r2(W - 6) + '" y="40">for all 84</text>';
    }
    s += '<g class="vd-dots">';
    lay.pts.forEach(function (p) {
      if (p.off && !wide) return;
      var y = y0 - lay.r - 1.5 - p.lv * lay.d;
      var hit = rows[p.i][key] >= bar ? " is-hit" : "";
      s += '<circle class="vd-dot' + hit + (p.off ? " is-off" : "") + '" data-i="' + p.i + '" cx="' + r2(p.x) + '" cy="' + r2(y) + '" r="' + lay.r + '"/>';
    });
    return s + "</g></svg>";
  }

  /* ------------------------------------------------------------ 5. the detection floor
     A caliper plate: change in out-of-fold log-loss, in nats, negative is
     better. The hatched band is the floor: what this instrument cannot
     resolve. Everything ever measured on the main pool sits inside it. */
  function floor(F, W, sfx) {
    sfx = sfx || "";
    var wide = W > 700;
    var lo = -0.006, hi = 0.006;
    var padL = wide ? 0.25 : 0.02, padR = wide ? 0.03 : 0.02;
    function fx(v) { return padL + (v - lo) / (hi - lo) * (1 - padL - padR); }
    var rows = [
      { key: "null", label: wide ? "Ten re-seeds of the same recipe, which change nothing" : "Ten re-seeds, which change nothing" },
      { key: "lever", label: wide ? "Eleven candidate levers from one study" : "Eleven candidate levers" },
      { key: "base", label: wide ? "One lever, read three ways" : "One lever, read three ways" },
      { key: "ship", label: wide ? "The only change the winner model shipped" : "The only change ever shipped" }
    ];
    var rowH = wide ? 42 : 60, top = wide ? 34 : 44, axisY = top + rows.length * rowH + 6, H = axisY + 48;
    var s = '<svg class="fl-svg" width="100%" height="' + H + '" role="img" aria-labelledby="fl-t' + sfx + ' fl-d' + sfx + '">' +
      '<title id="fl-t' + sfx + '">Everything measured on the main pool, against the detection floor</title>' +
      '<desc id="fl-d' + sfx + '">Change in out-of-fold log-loss in nats, negative is better, from minus 0.006 to 0.006. The detection floor is plus or minus 0.00362. Ten re-seeds of an unchanged recipe produce effects up to 0.00207. The only change the winner model shipped is worth 0.0026, and the largest re-seed is 80% of it. Every mark lies inside the floor.</desc>' +
      '<defs><pattern id="fl-h' + sfx + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="fl-hl"/></pattern></defs>';
    var b0 = fx(-F.mde), b1 = fx(F.mde);
    s += '<rect class="fl-band" fill="url(#fl-h' + sfx + ')" x="' + pc(b0) + '" y="' + (top - 18) + '" width="' + pc(b1 - b0) + '" height="' + (axisY - top + 18) + '"/>';
    s += '<line class="fl-edge" x1="' + pc(b0) + '" x2="' + pc(b0) + '" y1="' + (top - 18) + '" y2="' + (axisY + 8) + '"/>';
    s += '<line class="fl-edge" x1="' + pc(b1) + '" x2="' + pc(b1) + '" y1="' + (top - 18) + '" y2="' + (axisY + 8) + '"/>';
    var mde = F.mde.toFixed(5);
    if (wide) {
      s += '<text class="fl-cap is-l" x="' + pc(b0) + '" y="' + (top - 24) + '" dx="6">detection floor, −' + mde + "</text>";
      s += '<text class="fl-cap" x="' + pc(b1) + '" y="' + (top - 24) + '" dx="-6">+' + mde + "</text>";
    } else {
      s += '<text class="fl-cap is-mid" x="' + pc((b0 + b1) / 2) + '" y="' + (top - 24) + '">detection floor, ±' + mde + "</text>";
    }
    s += '<line class="fl-axis" x1="' + pc(fx(lo)) + '" x2="' + pc(fx(hi)) + '" y1="' + axisY + '" y2="' + axisY + '"/>';
    for (var i = -30; i <= 30; i++) {
      var v = i * 0.0002, maj = i % 10 === 0, mid = i % 5 === 0;
      s += '<line class="fl-tk" x1="' + pc(fx(v)) + '" x2="' + pc(fx(v)) + '" y1="' + axisY + '" y2="' + (axisY + (maj ? 12 : mid ? 8 : 4)) + '"/>';
      if (maj && (wide || i % 20 === 0 || i === 0)) s += '<text class="fl-n" x="' + pc(fx(v)) + '" y="' + (axisY + 28) + '">' + (v === 0 ? "0" : minus(v, 3)) + "</text>";
    }
    var levers = F.levers.filter(function (l) { return !l.shipped && !/^nationality/.test(l.name); });
    var bases = F.levers.filter(function (l) { return /^nationality/.test(l.name); });
    var ship = F.levers.filter(function (l) { return l.shipped; });
    rows.forEach(function (row, ri) {
      var y = top + ri * rowH + rowH / 2;
      s += '<line class="fl-row" x1="' + pc(fx(lo)) + '" x2="' + pc(fx(hi)) + '" y1="' + y + '" y2="' + y + '"/>';
      if (wide) s += '<text class="fl-lab" x="0" y="' + (y + 4) + '">' + row.label + "</text>";
      else s += '<text class="fl-lab is-top" x="' + pc(fx(lo)) + '" y="' + (y - 17) + '">' + row.label + "</text>";
      var items = row.key === "null" ? F.nulls.map(function (v) { return { effect: v, name: "A re-seed" }; })
        : row.key === "lever" ? levers : row.key === "base" ? bases : ship;
      items.forEach(function (it, j) {
        var x = pc(fx(it.effect));
        var tip = ' data-tip="' + esc(it.name.charAt(0).toUpperCase() + it.name.slice(1)) + ": " + signed(it.effect, 5).replace(/0+$/, "") + ' nats"';
        var st = ' style="--j:' + j + '"';
        if (row.key === "null") s += '<line class="fl-m fl-null"' + st + tip + ' x1="' + x + '" x2="' + x + '" y1="' + (y - 9) + '" y2="' + (y + 9) + '"/>';
        else if (row.key === "lever") s += '<circle class="fl-m fl-lever"' + st + tip + ' cx="' + x + '" cy="' + y + '" r="5"/>';
        else if (row.key === "base") s += '<svg class="fl-m" x="' + x + '" y="' + y + '" overflow="visible"' + st + tip + '><rect class="fl-base" x="-4.5" y="-4.5" width="9" height="9"/></svg>';
        else s += '<svg class="fl-m" x="' + x + '" y="' + y + '" overflow="visible"' + st + tip + '><path class="fl-ship" d="M0 -8 L8 0 L0 8 L-8 0 Z"/></svg>';
      });
    });
    // the paper's headline: the largest re-seed, mirrored beside the shipped change, is 80% of it
    var yN = top + rowH / 2, yS = top + 3 * rowH + rowH / 2;
    var shipV = ship.length ? ship[0].effect : -0.0026;
    s += '<text class="fl-ann" x="' + pc(fx(F.largest_null)) + '" y="' + (wide ? yN - 13 : yN + 24) + '">' + (wide ? "largest, " : "") + F.largest_null.toFixed(5) + "</text>";
    s += '<line class="fl-ghost" x1="' + pc(fx(-F.largest_null)) + '" x2="' + pc(fx(-F.largest_null)) + '" y1="' + (yS - 10) + '" y2="' + (yS + 10) + '"/>';
    var yB = wide ? yS - 17 : yS + 15;
    s += '<line class="fl-brk" x1="' + pc(fx(shipV)) + '" x2="' + pc(fx(-F.largest_null)) + '" y1="' + yB + '" y2="' + yB + '"/>';
    s += '<text class="fl-ann' + (wide ? "" : " is-l") + '" x="' + pc(wide ? (fx(shipV) + fx(-F.largest_null)) / 2 : fx(-F.largest_null)) + '" y="' + (wide ? yS - 23 : yS + 19) + '"' + (wide ? "" : ' dx="6"') + '>' + (wide ? "a re-seed, 80% of it" : "a re-seed: 80% of it") + "</text>";
    s += '<text class="fl-ann is-r" x="' + pc(fx(shipV)) + '" y="' + (yS + 4) + '" dx="-14" text-anchor="end">' + minus(shipV, 4) + "</text>";
    s += '<text class="fl-dir" x="' + pc(fx(lo)) + '" y="' + (axisY + 44) + '">← better</text>';
    s += '<text class="fl-dir is-r" x="' + pc(fx(hi)) + '" y="' + (axisY + 44) + '">worse →</text>';
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ 6. Vertex Boxing
     (a) closing-line value by the level of the fight, with 95% intervals;
     (b) four betting windows on the page's own e-value scale, from 1 to
     1,680. How each test was fixed is the needle's head: filled for a test
     published before it ran, hollow for one committed locally, none for a
     window declared in advance as already seen. Red means it cleared 20. */
  function levelBars(level, W, sfx) {
    var rows = level.rows, wide = W > 620;
    sfx = sfx || (wide ? "-w" : "-n");
    var max = 0.03, lab = wide ? 0.27 : 0, rt = wide ? 0.13 : 0.16;
    var rowH = wide ? 46 : 64, top = 26, H = top + rows.length * rowH + 30;
    function fx(v) { return lab + v / max * (1 - lab - rt); }
    var s = '<svg class="lv-svg" width="100%" height="' + H + '" role="img" aria-labelledby="lv-t' + sfx + ' lv-d' + sfx + '">' +
      '<title id="lv-t' + sfx + '">Closing-line value by scheduled distance</title>' +
      '<desc id="lv-d' + sfx + '">' + rows.map(function (r) { return r.label + " (" + r.kind + ", " + fmtInt(r.bets) + " bets): " + signed(r.clv, 4) + ", 95% interval " + signed(r.lo, 4) + " to " + signed(r.hi, 4) + ", realised return " + signed(r.ret * 100, 1) + "%"; }).join(". ") + ".</desc>";
    s += '<text class="lv-k" x="' + pc(fx(0)) + '" y="12">closing-line value, in probability</text>';
    s += '<text class="lv-k is-r" x="100%" y="12">return</text>';
    [0, 0.01, 0.02, 0.03].forEach(function (v, i) {
      var x = pc(fx(v));
      s += '<line class="lv-g' + (v === 0 ? " is-0" : "") + '" x1="' + x + '" x2="' + x + '" y1="' + (top - 4) + '" y2="' + (H - 26) + '"/>';
      s += '<text class="lv-n" x="' + x + '" y="' + (H - 8) + '">' + (v === 0 ? "0" : "+" + v.toFixed(2)) + "</text>";
    });
    rows.forEach(function (r, i) {
      var y = top + i * rowH + (wide ? rowH / 2 : rowH - 20);
      if (wide) {
        s += '<text class="lv-lab" x="0" y="' + (y - 1) + '">' + r.label + "</text>";
        s += '<text class="lv-sub" x="0" y="' + (y + 14) + '">' + r.kind + "</text>";
      } else {
        s += '<text class="lv-lab" x="0" y="' + (y - 16) + '">' + r.label + ' <tspan class="lv-sub">' + r.kind + "</tspan></text>";
      }
      s += '<rect class="lv-bar" style="--i:' + i + '" x="' + pc(fx(0)) + '" y="' + (y - 7) + '" width="' + pc(fx(r.clv) - fx(0)) + '" height="14"/>';
      s += '<line class="lv-ci" x1="' + pc(fx(r.lo)) + '" x2="' + pc(fx(r.hi)) + '" y1="' + y + '" y2="' + y + '"/>';
      s += '<line class="lv-ci" x1="' + pc(fx(r.lo)) + '" x2="' + pc(fx(r.lo)) + '" y1="' + (y - 5) + '" y2="' + (y + 5) + '"/>';
      s += '<line class="lv-ci" x1="' + pc(fx(r.hi)) + '" x2="' + pc(fx(r.hi)) + '" y1="' + (y - 5) + '" y2="' + (y + 5) + '"/>';
      s += '<text class="lv-v" x="' + pc(fx(r.hi)) + '" dx="8" y="' + (y + 5) + '">' + signed(r.clv, 4) + "</text>";
      s += '<text class="lv-ret' + (r.ret < 0 ? " is-neg" : "") + '" x="100%" y="' + (y + 5) + '">' + signed(r.ret * 100, 1) + "%</text>";
    });
    return s + "</svg>";
  }

  function gaugeX(v, W) { var f0 = gx(1), lab = W > 620 ? 0.27 : 0; return lab + ((gx(Math.min(v, GRID.hi)) - f0) / (1 - f0)) * (1 - lab); }
  function windowsGauge(win, W, sfx) {
    var rows = win.rows, bar = win.bar, wide = W > 620;
    sfx = sfx || (wide ? "-w" : "-n");
    var f0 = gx(1);
    function bx(v) { return (gx(Math.min(v, GRID.hi)) - f0) / (1 - f0); }
    var lab = wide ? 0.27 : 0;
    function X(v) { return lab + bx(v) * (1 - lab); }
    var rowH = wide ? 58 : 76, top = 30, H = top + rows.length * rowH + 34;
    var s = '<svg class="wg-svg" width="100%" height="' + H + '" role="img" aria-labelledby="wg-t' + sfx + ' wg-d' + sfx + '">' +
      '<title id="wg-t' + sfx + '">Four betting windows at the opening price, scored as e-values</title>' +
      '<desc id="wg-d' + sfx + '">' + rows.map(function (r) { return r.when + ", " + fmtInt(r.bouts) + " bouts, " + r.how + ": e = " + r.label.replace("^", " to the ") + (r.e >= bar ? ", past the bar of 20" : ", short of the bar of 20"); }).join(". ") + ".</desc>";
    // the scale: 1 .. 1,680 of the page grid
    gridValues().forEach(function (g) {
      if (g.v < 1) return;
      var c = gridClass(g);
      if (c === "gn" && !wide) return;
      s += '<line class="wg-g ' + c + '" x1="' + pc(X(g.v)) + '" x2="' + pc(X(g.v)) + '" y1="' + (top - 6) + '" y2="' + (H - 28) + '"/>';
    });
    s += '<line class="wg-bar" x1="' + pc(X(bar)) + '" x2="' + pc(X(bar)) + '" y1="' + (top - 16) + '" y2="' + (H - 24) + '"/>';
    s += '<text class="wg-barcap" x="' + pc(X(bar)) + '" y="' + (top - 20) + '">the bar, 20</text>';
    [1, 10, 100].forEach(function (v) { s += '<text class="wg-n' + (v === 1 ? " is-first" : "") + '" x="' + pc(X(v)) + '" y="' + (H - 8) + '">' + v + "</text>"; });
    s += '<text class="wg-n is-bar" x="' + pc(X(bar)) + '" y="' + (H - 8) + '">20</text>';
    s += '<text class="wg-n is-end" x="100%" y="' + (H - 8) + '">1,680</text>';
    rows.forEach(function (r, i) {
      var y = top + i * rowH + rowH - 14, off = r.e > GRID.hi, hit = r.e >= bar;
      var fx = off ? 1 : X(r.e);
      if (wide) {
        s += '<text class="wg-lab" x="0" y="' + (y - 16) + '">' + r.when + "</text>";
        s += '<text class="wg-sub" x="0" y="' + (y + 1) + '">' + fmtInt(r.bouts) + " bouts, " + r.price + "</text>";
      } else {
        s += '<text class="wg-lab" x="0" y="' + (y - 44) + '">' + r.when + ' <tspan class="wg-sub">' + fmtInt(r.bouts) + " bouts, " + r.price + "</tspan></text>";
      }
      s += '<line class="wg-base" x1="' + pc(X(1)) + '" x2="100%" y1="' + y + '" y2="' + y + '"/>';
      var head = r.fixed === "public" ? '<path class="wg-h is-fill" d="M-6 -30 L6 -30 L0 -21 Z"/>'
        : r.fixed === "local" ? '<path class="wg-h is-hollow" d="M-5.5 -29.5 L5.5 -29.5 L0 -21.5 Z"/>'
        : '<circle class="wg-h is-dot" cy="-25" r="2.2"/>';
      s += '<svg class="wg-needle' + (hit ? " is-hit" : "") + (off ? " is-off" : "") + '" x="' + pc(fx) + '" y="' + y + '" overflow="visible" data-f="' + r2(fx * 1e4) / 1e4 + '" data-e="' + r.e + '" style="--i:' + i + '"><g class="wg-ng">' +
        '<line class="wg-l" x1="0" x2="0" y1="-30" y2="0"/>' + head +
        (off ? '<path class="wg-stop" d="M-15 -29 L-7 -24.5 L-15 -20 Z"/>' : "") + "</g></svg>";
      var lbl = r.label.replace(/\^(\d+)/, '<tspan class="sup" dy="-6">$1</tspan>');
      var side = off ? ' dx="-22" text-anchor="end"' : hit ? ' dx="10"' : ' dx="-10" text-anchor="end"';
      s += '<text class="wg-v' + (hit ? " is-hit" : "") + '" x="' + pc(fx) + '" y="' + (y - 18) + '"' + side + ">e = " + lbl + "</text>";
      if (off) s += '<text class="wg-off" x="' + pc(fx) + '" y="' + (y - 3) + '" dx="-22" text-anchor="end">off this scale</text>';
    });
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ 7. Zacks: one day's screen
     4,369 = 257 x 17, one dot per stock in the screen. The book is 25 equal
     positions. Which 25 is private, so the figure draws the counts only. */
  function zacksField(cols, rows, last) {
    var H = rows + (last ? 1 : 0), VH = H + 2.4;
    var s = '<svg class="zk-field" viewBox="0 0 ' + cols + " " + VH + '" width="100%" preserveAspectRatio="xMinYMin meet" focusable="false" aria-hidden="true">' +
      '<defs><pattern id="zk-dot-' + cols + '" width="1" height="1" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.22" class="zk-d"/></pattern></defs>' +
      '<rect x="0" y="0" width="' + cols + '" height="' + rows + '" fill="url(#zk-dot-' + cols + ')"/>';
    if (last) s += '<rect x="0" y="' + rows + '" width="' + last + '" height="1" fill="url(#zk-dot-' + cols + ')"/>';
    // the book, at the screen's own scale: 25 dots beneath it
    s += '<g class="zk-picks">';
    for (var i = 0; i < 25; i++) s += '<circle class="zk-p" style="--i:' + i + '" cx="' + (i + 0.5) + '" cy="' + (H + 1.9) + '" r="0.3"/>';
    return s + "</g></svg>";
  }
  /* 25 hairlines opening the book out from the screen's scale to full width */
  function zacksFan(cols) {
    var s = '<svg viewBox="0 0 1000 60" preserveAspectRatio="none" focusable="false" aria-hidden="true">';
    for (var i = 0; i < 25; i++) {
      var x0 = r2((i + 0.5) / cols * 1000), x1 = r2((i + 0.5) * 40);
      s += '<path style="--i:' + i + '" vector-effect="non-scaling-stroke" d="M' + x0 + ' 0 C ' + x0 + ' 34, ' + x1 + ' 26, ' + x1 + ' 60"/>';
    }
    return s + "</svg>";
  }

  /* ------------------------------------------------------------ 8. the AUC gauge */
  function aucScale() {
    var s = '<svg class="auc-svg" width="100%" height="30" focusable="false" aria-hidden="true">';
    s += '<line class="auc-base" x1="0" x2="100%" y1="29.5" y2="29.5"/>';
    for (var i = 0; i <= 50; i++) {
      var f = i / 50, len = i % 10 === 0 ? 16 : i % 5 === 0 ? 10 : 5;
      s += '<line class="auc-t" x1="' + pc(f) + '" x2="' + pc(f) + '" y1="' + (29.5 - len) + '" y2="29.5"/>';
    }
    return s + "</svg>";
  }

  var api = {
    GRID: GRID, gx: gx, pc: pc, r2: r2, fmtE: fmtE, fmtInt: fmtInt, fmtAxis: fmtAxis, signed: signed, minus: minus,
    gridValues: gridValues, gridClass: gridClass,
    grid: grid, edge: edge, RULE: RULE, dx: dx, cx: cx, ruleD: ruleD, ruleC: ruleC,
    verdictLayout: verdictLayout, verdict: verdict, floor: floor,
    levelBars: levelBars, windowsGauge: windowsGauge, gaugeX: gaugeX, zacksField: zacksField, zacksFan: zacksFan, aucScale: aucScale
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Fig = api;
})(this);
