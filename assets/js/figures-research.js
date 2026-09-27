/* Figures for /research/, pre-rendered into research/index.html by
   tools/figures.mjs (markers named rs*).

   Same rules as figures.js: pure functions that return SVG strings, x
   positions as percentages of the frame so every figure is fluid without
   a re-render, and nothing drawn that is not in assets/data/audit.json or
   in the paper's own numbers. Where a figure is drawn on the page's e-value
   axis it uses Fig.gx, so its ticks land on the lines behind the page. */
(function (root) {
  "use strict";

  var L = Math.log10 || function (v) { return Math.log(v) / Math.LN10; };
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* the same names site.js gives the slices */
  var FAM = { form_momentum: "Form and momentum", style_matchups: "Style matchups", physical_durability: "Physical durability", market_microstructure: "Market microstructure", gap: "Gap", experience_pedigree: "Experience and pedigree", division_context: "Division context", style_and_age: "Style and age", activity_layoff: "Activity and layoff" };
  var WORDS = { tdd: "takedown defence", ufc: "UFC", elo: "Elo", ko: "KO", womens: "women's", pickem: "pick'em", "4plus": "4+" };
  function sliceName(s) {
    var t = s.split("_").map(function (x) { return WORDS[x] || x; }).join(" ").replace(/ (\d+)d?$/, ", $1 days");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  var VERDICT = {
    both: "Clears 20 at fair odds and after the margin, on the most favourable of five seeds: its five-seed median is 12.3. The bar for all 84 at once is 1,680.",
    fair: "Clears 20 at fair odds, then loses it to the book’s margin. The bar for all 84 at once is 1,680.",
    up: "Made money at fair odds, and stopped short of the bar of 20.",
    down: "Lost money at fair odds: an e-value below 1 is a bankroll that shrank."
  };
  function verdictOf(r) { return r.er >= 20 ? VERDICT.both : r.ef >= 20 ? VERDICT.fair : r.ef >= 1 ? VERDICT.up : VERDICT.down; }

  function make(F) {
    var pc = F.pc, r2 = F.r2;

    /* ------------------------------------------------------------ the 84
       x: e at fair odds on the page's own axis (0.01 at the frame's left
       edge, 1,680 at its right). y: e after the margin, log, 100 down to
       0.001. Marks under 0.01 at fair odds are off the page's scale; they
       stack in the margin, hollow, as on the verdict chart. */
    var SC_N = 688;
    function scGeo(wide) {
      var g = wide ? { T: 62, DH: 76, rmax: 9, ro: 3.6, wide: true } : { T: 46, DH: 52, rmax: 5.6, ro: 2.5, wide: false };
      g.y = function (v) { return g.T + (2 - L(v)) * g.DH; };
      g.Y0 = g.y(0.0005);
      g.H = g.Y0 + (wide ? 50 : 62);
      return g;
    }
    function scPos(rows, g) {
      var off = [], out = {};
      rows.forEach(function (r, i) {
        var rad = r2(g.rmax * Math.sqrt(r.n / SC_N));
        if (r.ef < 0.01) { off.push(i); return; }
        out[i] = { x: pc(F.gx(r.ef)), f: F.gx(r.ef), y: r2(g.y(Math.max(r.er, 0.0005))), ys: r2(g.y(Math.min(r.ef, 100))), r: rad };
      });
      off.sort(function (a, b) { return rows[b].ef - rows[a].ef; });
      var cols = g.wide ? 2 : 1, d = 2 * g.ro + 2.4;
      off.forEach(function (i, j) {
        var c = j % cols, rr = Math.floor(j / cols);
        var x = -(g.ro + (g.wide ? 5 : 4.5)) - c * d;
        out[i] = { x: r2(x), f: null, px: r2(x), y: r2(g.Y0 - g.ro - 1.5 - rr * d), ys: null, r: g.ro, off: true };
      });
      return out;
    }
    function bestIndex(rows) { var b = 0; rows.forEach(function (r, i) { if (r.ef > rows[b].ef) b = i; }); return b; }

    function scatter(rows, wide, sfx) {
      var g = scGeo(wide), T = g.T, Y0 = g.Y0, H = g.H;
      var pos = scPos(rows, g), best = bestIndex(rows);
      var s = '<svg class="rs-sc-svg" width="100%" height="' + r2(H) + '" data-t="' + T + '" data-y0="' + r2(Y0) + '" data-y20="' + r2(g.y(20)) + '" overflow="visible" role="img" aria-labelledby="sc-t' + sfx + ' sc-d' + sfx + '">' +
        '<title id="sc-t' + sfx + '">All 84 hypotheses, at the wealth each one earned</title>' +
        '<desc id="sc-d' + sfx + '">Each mark is one pre-registered hypothesis. Horizontally, its e-value at fair odds on the page\'s own logarithmic axis from 0.01 to 1,680; vertically, the same bet charged the bookmaker\'s margin, on a logarithmic axis from 0.001 to 100. Mark size grows with the number of bouts. Six marks clear 20 at fair odds; one also clears 20 after the margin, at 21.2, on the most favourable of five seeds. None comes near 1,680. Ten marks are under 0.01 at fair odds and sit in the margin.</desc>';
      // log-log paper: the page's verticals show through; the plot adds its minor lines and the horizontals
      F.gridValues().forEach(function (v) {
        var c = F.gridClass(v);
        if (c !== "gn" && c !== "gh") return;
        if (c === "gn" && !wide) return;
        var x = pc(F.gx(v.v));
        s += '<line class="rs-gv ' + c + '" x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + r2(Y0) + '"/>';
      });
      for (var k = -3; k <= 2; k++) {
        for (var m = 1; m <= 9; m++) {
          var v = m * Math.pow(10, k);
          if (v > 100.0001) break;
          var c = m === 1 ? (k === 0 ? "g1" : "gd") : (m === 2 || m === 5) ? "gh" : "gn";
          if (c === "gn" && !wide) continue;
          var y = r2(g.y(v));
          s += '<line class="rs-gh ' + c + '" x1="0" x2="100%" y1="' + y + '" y2="' + y + '"/>';
        }
      }
      // the bars: 20 both ways, 1,680 at the right edge
      var x20 = pc(F.gx(20)), y20 = r2(g.y(20));
      s += '<line class="rs-b20" x1="' + x20 + '" x2="' + x20 + '" y1="' + (T - 4) + '" y2="' + r2(Y0) + '"/>';
      s += '<line class="rs-b20" x1="0" x2="100%" y1="' + y20 + '" y2="' + y20 + '"/>';
      s += '<line class="rs-ge" x1="100%" x2="100%" y1="' + (wide ? 4 : 2) + '" y2="' + r2(Y0) + '"/>';
      s += '<text class="rs-cap" x="' + x20 + '" y="' + (T - 10) + '" text-anchor="middle">20</text>';
      s += wide ? '<text class="rs-cap" x="100%" dx="-6" y="' + r2(g.y(20) - 5) + '" text-anchor="end">20</text>'
        : '<text class="rs-cap" x="4" y="' + r2(g.y(20) - 5) + '">20</text>';
      s += '<text class="rs-cap" x="100%" dx="-6" y="' + (wide ? 12 : 10) + '" text-anchor="end">' + (wide ? "1,680, the bar for all 84 at once" : "1,680, for all 84") + '</text>';
      s += '<text class="rs-ax" x="100%" dx="-6" y="' + (wide ? 40 : 25) + '" text-anchor="end">e after the margin</text>';
      [100, 10, 1, 0.1, 0.01, 0.001].forEach(function (v) {
        s += '<text class="rs-yn" x="100%" dx="-6" y="' + r2(g.y(v) - 5) + '" text-anchor="end">' + F.fmtAxis(v) + "</text>";
      });
      // the axis
      s += '<line class="rs-axis" x1="0" x2="100%" y1="' + r2(Y0) + '" y2="' + r2(Y0) + '"/>';
      F.gridValues().forEach(function (v) {
        var c = F.gridClass(v), len = c === "gn" ? 4 : c === "gh" ? 7 : 10;
        if (c === "gn" && !wide) len = 3;
        var x = pc(F.gx(v.v));
        s += '<line class="rs-tk" x1="' + x + '" x2="' + x + '" y1="' + r2(Y0) + '" y2="' + r2(Y0 + len) + '"/>';
      });
      [0.01, 0.1, 1, 10, 100].forEach(function (v) {
        s += '<text class="rs-xn' + (v === 0.01 ? " is-first" : "") + '" x="' + pc(F.gx(v)) + '" y="' + r2(Y0 + 22) + '">' + F.fmtAxis(v) + "</text>";
      });
      s += '<text class="rs-xn is-bar" x="' + x20 + '" y="' + r2(Y0 + 22) + '">20</text>';
      s += '<text class="rs-xn is-bar is-end" x="100%" y="' + r2(Y0 + 22) + '">1,680</text>';
      s += '<text class="rs-ax" x="100%" y="' + r2(Y0 + 42) + '" text-anchor="end">e at fair odds</text>';
      var nOff = rows.filter(function (r) { return r.ef < 0.01; }).length;
      if (wide) s += '<text class="rs-off" x="-4" y="' + r2(Y0 + 22) + '">under</text><text class="rs-off" x="-4" y="' + r2(Y0 + 36) + '">0.01</text>';
      else s += '<text class="rs-off is-count" x="0" y="' + r2(Y0 + 42) + '">← ' + nOff + " under 0.01</text>";
      // the selection: a cursor on the default mark
      var b = pos[best];
      s += '<g class="rs-guide" data-sc-guide>' +
        '<line class="rs-gx" x1="' + b.x + '" x2="' + b.x + '" y1="' + b.y + '" y2="' + r2(Y0) + '"/>' +
        '<line class="rs-gy" x1="' + b.x + '" x2="100%" y1="' + b.y + '" y2="' + b.y + '"/>' +
        '<circle class="rs-ring" cx="' + b.x + '" cy="' + b.y + '" r="' + r2(b.r + 5) + '"/></g>';
      // the marks, largest first so small ones stay on top
      var order = rows.map(function (r, i) { return i; }).sort(function (a, b2) { return rows[b2].n - rows[a].n; });
      s += '<g class="rs-marks">';
      order.forEach(function (i) {
        var r = rows[i], p = pos[i];
        var cls = "rs-m" + (p.off ? " is-off" : "") + (r.er >= 20 ? " is-both is-up" : r.ef >= 20 ? " is-fair" : "") + (i === best ? " is-on" : "");
        s += '<circle class="' + cls + '" data-i="' + i + '" data-f="' + r.f + '"' + (p.off ? "" : ' data-fx="' + r2(p.f * 1e5) / 1e5 + '" data-ys="' + p.ys + '"') + ' data-y="' + p.y + '" cx="' + p.x + '" cy="' + p.y + '" r="' + p.r + '"/>';
      });
      return s + "</g></svg>";
    }

    /* the readout's first state, for readers without JavaScript */
    function readout(rows) {
      var i = bestIndex(rows), r = rows[i];
      var rank = rows.filter(function (x) { return x.ef > r.ef; }).length + 1;
      return '<p class="rs-ro-s" data-ro="s">' + esc(sliceName(r.s)) + "</p>" +
        '<p class="rs-ro-f"><span data-ro="f">' + FAM[r.f] + '</span>, <span data-ro="n">' + F.fmtInt(r.n) + "</span> bouts</p>" +
        '<p class="rs-ro-e"><span><b class="' + (r.ef >= 20 ? "is-hit" : "") + '" data-ro="ef">e = ' + F.fmtE(r.ef) + '</b> at fair odds</span><span><b class="' + (r.er >= 20 ? "is-hit" : "") + '" data-ro="er">e = ' + F.fmtE(r.er) + "</b> after the margin</span></p>" +
        '<p class="rs-ro-r" data-ro="r">Rank ' + rank + " of 84 at fair odds</p>" +
        '<p class="rs-ro-t" data-ro="t">' + esc(verdictOf(r)) + "</p>";
    }
    function rowsJson(rows) {
      var slim = rows.map(function (r) { return { s: r.s, f: r.f, n: r.n, ef: r.ef, er: r.er }; });
      return '<script type="application/json" id="rs-rows">' + JSON.stringify(slim) + "</script>";
    }
    function famChips(rows) {
      var count = {};
      rows.forEach(function (r) { count[r.f] = (count[r.f] || 0) + 1; });
      var s = '<button type="button" class="rs-chip" data-fam="" aria-pressed="true">All 84</button>';
      Object.keys(FAM).forEach(function (k) {
        s += '<button type="button" class="rs-chip" data-fam="' + k + '" aria-pressed="false">' + FAM[k] + " <i>" + count[k] + "</i></button>";
      });
      return s;
    }

    /* ------------------------------------------------------------ 4.81 against 20
       Row A is the page's e-axis: the segment's e-value so far, and the gap to
       the bar. Rows B are a bout count, linear: how many more bouts each price
       needs, from the paper (100 at fair odds, 253 at the book's). */
    function narrowX(v) { return 0.02 + L(v) / 2 * 0.96; }
    function wait(wide, sfx) {
      var XA = wide ? F.gx : narrowX;
      var x0 = wide ? F.gx(1) : 0.02, span = wide ? 1 - x0 : 0.96, BMAX = 280;
      function XB(b) { return x0 + b / BMAX * span; }
      var yA = wide ? 78 : 92, y1 = yA + (wide ? 84 : 98), y2 = y1 + (wide ? 46 : 58), yAx = y2 + 16, H = yAx + (wide ? 30 : 48);
      var s = '<svg class="rs-wt-svg" width="100%" height="' + H + '" overflow="visible" role="img" aria-labelledby="wt-t' + sfx + ' wt-d' + sfx + '">' +
        '<title id="wt-t' + sfx + '">A segment written off too early: its e-value so far, and the bouts it still needs</title>' +
        '<desc id="wt-d' + sfx + '">On the e-value axis the segment stands at 4.81, growing by 0.0143 nats a bout, against a threshold of 20. At fair odds it is 100 bouts short, seventeen months; at the book\'s prices, 253 bouts, three and a half years.</desc>' +
        '<defs><pattern id="wt-h' + sfx + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="rs-hl"/></pattern></defs>';
      // row A labels
      if (wide) {
        s += '<text class="rs-lab" x="0" y="' + (yA - 18) + '">The e-value so far</text>';
        s += '<text class="rs-sub" x="0" y="' + (yA - 1) + '">+0.0143 nats per bout, at fair odds</text>';
      } else {
        s += '<text class="rs-lab" x="0" y="16">The e-value so far</text>';
        s += '<text class="rs-sub" x="0" y="32">+0.0143 nats per bout, at fair odds</text>';
      }
      // gap, axis, bar
      var xa = XA(4.81), xb = XA(20);
      s += '<rect class="rs-gap" data-wt-gap fill="url(#wt-h' + sfx + ')" x="' + pc(xa) + '" y="' + (yA - 30) + '" width="' + pc(xb - xa) + '" height="30" data-w="' + pc(xb - xa) + '"/>';
      s += '<line class="rs-axis" x1="' + pc(XA(1)) + '" x2="' + (wide ? "100%" : pc(XA(100))) + '" y1="' + yA + '" y2="' + yA + '"/>';
      F.gridValues().forEach(function (v) {
        if (v.v < 1 || (!wide && v.v > 100)) return;
        var c = F.gridClass(v), len = (c === "gn") ? 4 : (c === "gh") ? 6 : 9;
        s += '<line class="rs-tk" x1="' + pc(XA(v.v)) + '" x2="' + pc(XA(v.v)) + '" y1="' + yA + '" y2="' + (yA + len) + '"/>';
      });
      (wide ? [1, 10, 100] : [1, 10]).forEach(function (v) {
        s += '<text class="rs-xn' + (v === 1 ? " is-first" : "") + '" x="' + pc(XA(v)) + '" y="' + (yA + 24) + '">' + v + "</text>";
      });
      s += '<text class="rs-xn is-bar" x="' + pc(xb) + '" y="' + (yA + 24) + '">20</text>';
      s += '<text class="rs-xn is-end" x="' + (wide ? "100%" : pc(XA(100))) + '" y="' + (yA + 24) + '">' + (wide ? "1,680" : "100") + "</text>";
      s += '<line class="rs-bar" x1="' + pc(xb) + '" x2="' + pc(xb) + '" y1="' + (yA - 44) + '" y2="' + (yA + 9) + '"/>';
      s += '<text class="rs-cap" x="' + pc(xb) + '" y="' + (yA - 50) + '" text-anchor="middle">the bar, 20</text>';
      s += '<text class="rs-ann" x="' + pc((xa + xb) / 2) + '" y="' + (yA - 11) + '" text-anchor="middle">not refuted</text>';
      // the projection, drawn only while it runs
      s += '<line class="rs-ghost" data-wt-ghost x1="' + pc(xa) + '" x2="' + pc(xa) + '" y1="' + (yA - 30) + '" y2="' + yA + '"/>';
      // the needle
      s += '<svg class="rs-nd" data-wt-needle x="' + pc(xa) + '" y="' + yA + '" overflow="visible" data-f="' + r2(xa * 1e4) / 1e4 + '" data-f0="' + r2(XA(1) * 1e4) / 1e4 + '"><g class="rs-ng">' +
        '<line class="rs-nl" x1="0" x2="0" y1="-30" y2="0"/><path class="rs-nh is-fill" d="M-6 -30 L6 -30 L0 -21 Z"/></g></svg>';
      s += '<text class="rs-v" data-wt-v x="' + pc(xa) + '" dx="-10" y="' + (yA - 18) + '" text-anchor="end">4.81</text>';
      // the wait, in bouts
      var rows = [{ y: y1, b: 100, k: "At fair odds", t: "100 bouts: seventeen months" }, { y: y2, b: 253, k: "At the book’s prices", t: "253 bouts: three and a half years" }];
      rows.forEach(function (r, i) {
        if (wide) s += '<text class="rs-lab is-s" x="0" y="' + (r.y + 5) + '">' + r.k + "</text>";
        s += '<line class="rs-wbase" x1="' + pc(XB(0)) + '" x2="' + pc(XB(BMAX)) + '" y1="' + r.y + '" y2="' + r.y + '"/>';
        s += '<line class="rs-wb" data-wt-bar="' + i + '" data-b="' + r.b + '" x1="' + pc(XB(0)) + '" x2="' + pc(XB(r.b)) + '" y1="' + r.y + '" y2="' + r.y + '"/>';
        s += '<line class="rs-wend" data-wt-end="' + i + '" x1="' + pc(XB(r.b)) + '" x2="' + pc(XB(r.b)) + '" y1="' + (r.y - 9) + '" y2="' + (r.y + 9) + '"/>';
        if (wide) {
          if (i === 0) s += '<text class="rs-wt-t" data-wt-t="0" x="' + pc(XB(r.b)) + '" dx="12" y="' + (r.y + 5) + '">' + r.t + "</text>";
          else s += '<text class="rs-wt-t" data-wt-t="1" x="' + pc(XB(r.b)) + '" y="' + (r.y - 14) + '" text-anchor="end">' + r.t + "</text>";
        } else {
          s += '<text class="rs-lab is-s" x="' + pc(XB(0)) + '" y="' + (r.y - 16) + '">' + r.k + ' <tspan class="rs-wt-t" data-wt-t="' + i + '">' + r.t + "</tspan></text>";
        }
      });
      s += '<line class="rs-axis is-thin" x1="' + pc(XB(0)) + '" x2="' + pc(XB(BMAX)) + '" y1="' + yAx + '" y2="' + yAx + '"/>';
      for (var b = 0; b <= BMAX; b += 10) {
        s += '<line class="rs-tk" x1="' + pc(XB(b)) + '" x2="' + pc(XB(b)) + '" y1="' + yAx + '" y2="' + (yAx + (b % 50 === 0 ? 8 : 4)) + '"/>';
        if (b % 50 === 0 && (wide || b % 100 === 0 || b === 250)) s += '<text class="rs-xn' + (b === 0 ? " is-first" : "") + '" x="' + pc(XB(b)) + '" y="' + (yAx + 23) + '">' + b + "</text>";
      }
      if (wide) s += '<text class="rs-sub" x="0" y="' + (yAx + 23) + '">bouts short of 20</text>';
      else s += '<text class="rs-sub" x="' + pc(XB(0)) + '" y="' + (yAx + 42) + '">bouts short of 20</text>';
      return s + "</svg>";
    }

    /* ------------------------------------------------------------ the ladder
       Three mixtures, each paying for more of the search, as needles on the
       page's e-axis: filled at fair odds, hollow at the prices the book
       offered. Red only where a needle clears 20. */
    function ladder(ld, wide, sfx) {
      var X = wide ? F.gx : narrowX;
      var top = wide ? 46 : 36, rowH = wide ? 64 : 84;
      var ys = [0, 1, 2].map(function (i) { return top + i * rowH + rowH - 12; });
      var yEnd = ys[2], H = yEnd + (wide ? 36 : 34);
      var bar = ld.threshold;
      var s = '<svg class="rs-ld-svg" width="100%" height="' + H + '" overflow="visible" role="img" aria-labelledby="ld-t' + sfx + ' ld-d' + sfx + '">' +
        '<title id="ld-t' + sfx + '">What a rule chosen after the fact is worth</title>' +
        '<desc id="ld-d' + sfx + '">Three mixture martingales on the e-value axis, each paying for more of the search. At fair odds: ' + ld.fair.join(", ") + ". At the prices the book offered: " + ld.real.join(", ") + ". Only the first, at fair odds, clears the threshold of " + bar + ".</desc>";
      var xEnd = wide ? "100%" : pc(X(100));
      s += '<line class="rs-bar" x1="' + pc(X(bar)) + '" x2="' + pc(X(bar)) + '" y1="' + (top - 8) + '" y2="' + (yEnd + 10) + '"/>';
      s += '<text class="rs-cap" x="' + pc(X(bar)) + '" y="' + (top - 15) + '" text-anchor="middle">the bar, 20</text>';
      ys.forEach(function (y, i) {
        var lab = ld.labels[i].charAt(0).toUpperCase() + ld.labels[i].slice(1);
        if (wide) s += '<text class="rs-lab" x="0" y="' + (y - 9) + '">' + esc(lab) + "</text>";
        else s += '<text class="rs-lab is-s" x="' + pc(X(1)) + '" y="' + (y - 46) + '">' + esc(lab) + "</text>";
        s += '<line class="rs-lb' + (i === 2 ? " is-last" : "") + '" x1="' + pc(X(1)) + '" x2="' + xEnd + '" y1="' + y + '" y2="' + y + '"/>';
        var ff = X(ld.fair[i]), fr = X(ld.real[i]), hit = ld.fair[i] >= bar;
        s += '<line class="rs-mg" data-ld-mg style="--i:' + i + '" x1="' + pc(fr) + '" x2="' + pc(ff) + '" y1="' + y + '" y2="' + y + '"/>';
        s += '<svg class="rs-nd is-real" data-ld-real x="' + pc(fr) + '" y="' + y + '" overflow="visible" data-f="' + r2(fr * 1e4) / 1e4 + '" data-ff="' + r2(ff * 1e4) / 1e4 + '" style="--i:' + i + '"><g class="rs-ng">' +
          '<line class="rs-nl" x1="0" x2="0" y1="-30" y2="0"/><path class="rs-nh is-hollow" d="M-5.5 -29.5 L5.5 -29.5 L0 -21.5 Z"/></g></svg>';
        s += '<svg class="rs-nd is-fair' + (hit ? " is-hit" : "") + '" data-ld-fair x="' + pc(ff) + '" y="' + y + '" overflow="visible" data-f="' + r2(ff * 1e4) / 1e4 + '" data-e="' + ld.fair[i] + '" style="--i:' + i + '"><g class="rs-ng">' +
          '<line class="rs-nl" x1="0" x2="0" y1="-30" y2="0"/><path class="rs-nh is-fill" d="M-6 -30 L6 -30 L0 -21 Z"/></g></svg>';
        s += '<text class="rs-v' + (hit ? " is-hit" : "") + '" data-ld-v style="--i:' + i + '" x="' + pc(ff) + '" dx="' + (hit ? 10 : -10) + '" y="' + (y - 17) + '"' + (hit ? "" : ' text-anchor="end"') + ">" + ld.fair[i].toFixed(2) + "</text>";
        s += '<text class="rs-v is-real" data-ld-v style="--i:' + i + '" x="' + pc(fr) + '" dx="-10" y="' + (y - 17) + '" text-anchor="end">' + ld.real[i].toFixed(2) + "</text>";
      });
      F.gridValues().forEach(function (v) {
        if (v.v < 1 || (!wide && v.v > 100)) return;
        var c = F.gridClass(v), len = c === "gn" ? 3 : c === "gh" ? 5 : 8;
        s += '<line class="rs-tk" x1="' + pc(X(v.v)) + '" x2="' + pc(X(v.v)) + '" y1="' + yEnd + '" y2="' + (yEnd + len) + '"/>';
      });
      (wide ? [1, 10, 100] : [1, 10]).forEach(function (v) {
        s += '<text class="rs-xn' + (v === 1 ? " is-first" : "") + '" x="' + pc(X(v)) + '" y="' + (yEnd + 24) + '">' + v + "</text>";
      });
      s += '<text class="rs-xn is-bar" x="' + pc(X(bar)) + '" y="' + (yEnd + 24) + '">20</text>';
      s += '<text class="rs-xn is-end" x="' + xEnd + '" y="' + (yEnd + 24) + '">' + (wide ? "1,680" : "100") + "</text>";
      return s + "</svg>";
    }

    /* ------------------------------------------------------------ the seed budget
       The detection floor against the number of seeds, from the paper's
       curve: it falls from 0.00362 at one seed towards 0.00288 and gets
       within 2% of it at fifteen. */
    function budget(B, wide, sfx) {
      var pts = B.curve, asym = B.asymptote;
      var padL = wide ? 0.09 : 0.15, padR = 0.03, top = 36, ph = wide ? 196 : 176, lo = 0.0028, hi = 0.0037;
      function fx(k) { return padL + (k - 1) / 19 * (1 - padL - padR); }
      function fy(v) { return r2(top + (hi - v) / (hi - lo) * ph); }
      var axisY = top + ph + 10, H = axisY + 44, near = asym * 1.02;
      var k15 = pts.filter(function (p) { return p.mde <= near; })[0];
      var s = '<svg class="rs-bu-svg" width="100%" height="' + H + '" overflow="visible" role="img" aria-labelledby="bu-t' + sfx + ' bu-d' + sfx + '">' +
        '<title id="bu-t' + sfx + '">The detection floor, by the number of seeds</title>' +
        '<desc id="bu-d' + sfx + '">From ' + pts[0].mde + ' nats at one seed the floor falls towards an asymptote at ' + asym + '. It gets within 2% of it at ' + k15.k + ' seeds and reaches ' + pts[pts.length - 1].mde + ' at twenty.</desc>' +
        '<defs><pattern id="bu-h' + sfx + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" class="rs-hl"/></pattern></defs>';
      s += '<text class="rs-sub" x="0" y="14">nats</text>';
      for (var i = 0; i <= 9; i++) {
        var v = lo + i * 0.0001 + 0.0001;
        if (v > hi + 1e-9) break;
        var y = fy(v), lab = Math.round(v * 1e4) % 2 === 0;
        s += '<line class="rs-bg' + (lab ? " is-lab" : "") + '" x1="' + pc(padL) + '" x2="' + pc(1 - padR) + '" y1="' + y + '" y2="' + y + '"/>';
        if (lab) s += '<text class="rs-yn is-l" x="0" y="' + r2(y + 4) + '">' + v.toFixed(4) + "</text>";
      }
      s += '<rect class="rs-band" fill="url(#bu-h' + sfx + ')" x="' + pc(padL) + '" y="' + fy(near) + '" width="' + pc(1 - padL - padR) + '" height="' + r2(fy(asym) - fy(near)) + '"/>';
      s += '<line class="rs-asym" x1="' + pc(padL) + '" x2="' + pc(1 - padR) + '" y1="' + fy(asym) + '" y2="' + fy(asym) + '"/>';
      s += '<text class="rs-ann is-r" x="' + pc(1 - padR) + '" y="' + r2(fy(asym) + 17) + '" text-anchor="end">asymptote, ' + asym + "</text>";
      // the curve in its own viewBox so the path can scale with the frame
      var d = pts.map(function (p, j) { return (j ? "L" : "M") + (p.k - 1) + " " + r2(fy(p.mde) - top); }).join(" ");
      s += '<svg class="rs-bu-line" x="' + pc(padL) + '" y="' + top + '" width="' + pc(1 - padL - padR) + '" height="' + ph + '" viewBox="0 0 19 ' + ph + '" preserveAspectRatio="none" overflow="visible"><path d="' + d + '" vector-effect="non-scaling-stroke"/></svg>';
      s += '<line class="rs-k15" x1="' + pc(fx(k15.k)) + '" x2="' + pc(fx(k15.k)) + '" y1="' + r2(fy(k15.mde) + 8) + '" y2="' + axisY + '"/>';
      pts.forEach(function (p) {
        s += '<circle class="rs-bd' + (p.k === k15.k ? " is-k" : "") + '" style="--i:' + (p.k - 1) + '" data-k="' + p.k + '" data-v="' + p.mde + '" cx="' + pc(fx(p.k)) + '" cy="' + fy(p.mde) + '" r="' + (p.k === k15.k ? 4.5 : 3.2) + '"/>';
      });
      s += '<text class="rs-ann" x="' + pc(fx(1)) + '" dx="10" y="' + r2(fy(pts[0].mde) + 4) + '" text-anchor="start">' + pts[0].mde + " nats at one seed</text>";
      s += '<text class="rs-ann" x="' + pc(fx(k15.k)) + '" y="' + r2(fy(k15.mde) - 16) + '" text-anchor="middle">' + (wide ? "fifteen seeds, within 2%" : "15, within 2%") + "</text>";
      s += '<line class="rs-axis is-thin" x1="' + pc(fx(1)) + '" x2="' + pc(fx(20)) + '" y1="' + axisY + '" y2="' + axisY + '"/>';
      pts.forEach(function (p) {
        var major = p.k === 1 || p.k % 5 === 0;
        s += '<line class="rs-tk" x1="' + pc(fx(p.k)) + '" x2="' + pc(fx(p.k)) + '" y1="' + axisY + '" y2="' + (axisY + (major ? 7 : 4)) + '"/>';
        if (major) s += '<text class="rs-xn' + (p.k === k15.k ? " is-bar" : "") + '" x="' + pc(fx(p.k)) + '" y="' + (axisY + 21) + '">' + p.k + "</text>";
      });
      s += '<text class="rs-sub" x="' + pc(fx(20)) + '" y="' + (axisY + 38) + '" text-anchor="end">seeds</text>';
      // hover columns and the readout they drive
      var step = (1 - padL - padR) / 19;
      pts.forEach(function (p) {
        s += '<rect class="rs-bhit" data-k="' + p.k + '" x="' + pc(fx(p.k) - step / 2) + '" y="' + top + '" width="' + pc(step) + '" height="' + (axisY - top) + '"/>';
      });
      s += '<g class="rs-bro" data-bu-ro visibility="hidden"><rect class="rs-bro-b" x="0" y="0" width="10" height="24" rx="2"/><text class="rs-bro-t" x="0" y="0"></text></g>';
      return s + "</svg>";
    }

    return {
      scatter: scatter, readout: readout, rowsJson: rowsJson, famChips: famChips,
      wait: wait, ladder: ladder, budget: budget, sliceName: sliceName, FAM: FAM, verdictOf: verdictOf
    };
  }

  var api = {
    make: make,
    markers: function (F, data) {
      var R = make(F), rows = data.audit.segments.rows;
      return {
        rsScatterWide: function () { return R.scatter(rows, true, "-w"); },
        rsScatterNarrow: function () { return R.scatter(rows, false, "-n"); },
        rsReadout: function () { return R.readout(rows); },
        rsRows: function () { return R.rowsJson(rows); },
        rsChips: function () { return R.famChips(rows); },
        rsWaitWide: function () { return R.wait(true, "-w"); },
        rsWaitNarrow: function () { return R.wait(false, "-n"); },
        rsLadderWide: function () { return R.ladder(data.audit.ladder, true, "-w"); },
        rsLadderNarrow: function () { return R.ladder(data.audit.ladder, false, "-n"); },
        rsBudgetWide: function () { return R.budget(data.audit.budget, true, "-w"); },
        rsBudgetNarrow: function () { return R.budget(data.audit.budget, false, "-n"); }
      };
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else if (root.Fig) root.FigRS = make(root.Fig);
})(this);
