/* Figures for /work/vertex-boxing/ (and the five forecasts, on the home page too).

   Pure functions that return SVG strings, pre-rendered into the page by
   tools/figures.mjs (markers named vb*). Every number comes from
   assets/data/boxing.json, which copies the Vertex Boxing report section by
   section, or from the case copy; nothing here is computed from anything
   else. x positions are percentages of the figure's width and heights are in
   pixels, so a figure reflows without being redrawn; the page swaps the wide
   and narrow drawings at 760px.

   Marks that travel carry data-from and data-f (fractions of the width): the
   page script slides them from one to the other when the figure comes into
   view. Without the script, or with motion reduced, they are drawn where
   they belong. */
(function (root) {
  "use strict";

  function build(F) {
    var pc = F.pc, r2 = F.r2, signed = F.signed, fmtInt = F.fmtInt;
    function hatch(id) {
      return '<pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="bx-hl"/></pattern>';
    }
    function mv(from, to) { return ' data-from="' + r2(from * 1e4) / 1e4 + '" data-f="' + r2(to * 1e4) / 1e4 + '"'; }

    /* ------------------------------------------------ 1. the window the rule never saw: the move towards the model
       How far the price travelled towards the model between the open and the
       close, lower and upper tier on one axis, 0 to +0.04. The outlined rod
       under the upper bar is the lower tier's value laid twice end to end; the
       sliver between the two intervals is the gap that says they do not overlap. */
    function tiers(u, W, sfx) {
      var wide = W > 620;
      var lab = wide ? 0.27 : 0, rt = wide ? 0.12 : 0.18, max = 0.04;
      function fx(v) { return lab + v / max * (1 - lab - rt); }
      var rows = [
        { d: u.bottom, name: "Lower tier", sub: ["8 rounds or fewer, no belt", fmtInt(u.bottom.selected) + " bouts"] },
        { d: u.top, name: "Upper tier", sub: ["12 rounds, or a continental", "or world belt, " + fmtInt(u.top.selected) + " bouts"] }
      ];
      var top = 30, rowH = wide ? 60 : 84;
      function rowY(i) { return wide ? top + i * rowH + rowH / 2 : top + i * rowH + rowH - 26; }
      var axisY = top + rows.length * rowH + (wide ? 16 : 6), H = axisY + 22;
      var s = '<svg class="bx-svg uw-svg" width="100%" height="' + H + '" role="img" aria-labelledby="uwc-t' + sfx + ' uwc-d' + sfx + '">' +
        '<title id="uwc-t' + sfx + '">How far the price moved towards the model, by tier, 10 June 2021 to 10 June 2023</title>' +
        '<desc id="uwc-d' + sfx + '">Lower tier, ' + fmtInt(u.bottom.selected) + ' bouts: ' + signed(u.bottom.move, 4) + ', 95% interval ' + signed(u.bottom.lo, 4) + ' to ' + signed(u.bottom.hi, 4) + '. Upper tier, ' + fmtInt(u.top.selected) + ' bouts: ' + signed(u.top.move, 4) + ', 95% interval ' + signed(u.top.lo, 4) + ' to ' + signed(u.top.hi, 4) + '. In the upper tier the price moved ' + u.ratio.toFixed(1) + ' times as far towards the model as in the lower, and the two intervals do not overlap.</desc>' +
        "<defs>" + hatch("uw-h" + sfx) + "</defs>";
      s += '<text class="bx-k" x="' + pc(fx(0)) + '" y="12">move towards the model, in probability</text>';
      [0, 0.01, 0.02, 0.03, 0.04].forEach(function (v) {
        var x = pc(fx(v));
        s += '<line class="bx-g' + (v === 0 ? " is-0" : "") + '" x1="' + x + '" x2="' + x + '" y1="' + (top - 4) + '" y2="' + axisY + '"/>';
        s += '<text class="bx-n' + (v === 0 && !wide ? " is-first" : "") + '" x="' + x + '" y="' + (axisY + 17) + '">' + (v === 0 ? "0" : "+" + v.toFixed(2)) + "</text>";
      });
      var yL = rowY(0), yU = rowY(1);
      // the gap between the intervals: lower's upper end to upper's lower end
      var g0 = fx(u.bottom.hi), g1 = fx(u.top.lo);
      s += '<g class="uw-gap">';
      s += '<rect x="' + pc(g0) + '" y="' + (yL - 6) + '" width="' + pc(g1 - g0) + '" height="' + (yU - yL + 12) + '" fill="url(#uw-h' + sfx + ')"/>';
      s += '<line class="uw-gl" x1="' + pc(g0) + '" x2="' + pc(g0) + '" y1="' + (yL - 6) + '" y2="' + (yU + 6) + '"/>';
      s += '<line class="uw-gl" x1="' + pc(g1) + '" x2="' + pc(g1) + '" y1="' + (yL - 6) + '" y2="' + (yU + 6) + '"/>';
      s += '<text class="bx-ann" x="' + pc(g1) + '" dx="8" y="' + r2((yL + yU) / 2 + (wide ? 4 : -12)) + '">' + (wide ? "the intervals do not overlap" : "no overlap") + "</text>";
      s += "</g>";
      rows.forEach(function (r, i) {
        var y = rowY(i), d = r.d;
        if (wide) {
          s += '<text class="bx-lab" x="0" y="' + (y - 4) + '">' + r.name + "</text>";
          s += '<text class="bx-sub" x="0" y="' + (y + 12) + '">' + r.sub[0] + "</text>";
          s += '<text class="bx-sub" x="0" y="' + (y + 27) + '">' + r.sub[1] + "</text>";
        } else {
          s += '<text class="bx-lab" x="0" y="' + (y - 30) + '">' + r.name + ' <tspan class="bx-sub">' + (i ? "12 rounds, or a continental or world belt" : r.sub[0]) + "</tspan></text>";
          s += '<text class="bx-sub" x="0" y="' + (y - 15) + '">' + fmtInt(d.selected) + " bouts</text>";
        }
        s += '<rect class="uw-bar" style="--i:' + i + '" x="' + pc(fx(0)) + '" y="' + (y - 7) + '" width="' + pc(fx(d.move) - fx(0)) + '" height="14"/>';
        s += '<g class="uw-ci" style="--i:' + i + '">';
        s += '<line x1="' + pc(fx(d.lo)) + '" x2="' + pc(fx(d.hi)) + '" y1="' + y + '" y2="' + y + '"/>';
        s += '<line x1="' + pc(fx(d.lo)) + '" x2="' + pc(fx(d.lo)) + '" y1="' + (y - 5) + '" y2="' + (y + 5) + '"/>';
        s += '<line x1="' + pc(fx(d.hi)) + '" x2="' + pc(fx(d.hi)) + '" y1="' + (y - 5) + '" y2="' + (y + 5) + '"/>';
        s += "</g>";
        s += '<text class="bx-v uw-v" style="--i:' + i + '" x="100%" y="' + (y + 6) + '">' + signed(d.move, 4) + "</text>";
      });
      // the rod: the lower tier's value, twice, under the upper bar
      var w = fx(u.bottom.move) - fx(0), ry = yU + 12;
      s += '<g class="uw-rod">';
      s += '<rect class="uw-r uw-r1" style="--dy:' + (yL - yU) + 'px" x="' + pc(fx(0)) + '" y="' + ry + '" width="' + pc(w) + '" height="6"/>';
      s += '<rect class="uw-r uw-r2" x="' + pc(fx(0) + w) + '" y="' + ry + '" width="' + pc(w) + '" height="6"/>';
      // wide: under the rod, ending where it ends, clear of the value column; narrow: beside it
      if (wide) s += '<text class="bx-ann uw-rl" x="' + pc(fx(0) + 2 * w) + '" y="' + (ry + 20) + '" text-anchor="end">the lower tier, twice: ' + u.ratio.toFixed(1) + " times</text>";
      else s += '<text class="bx-ann uw-rl" x="' + pc(fx(0) + 2 * w) + '" dx="8" y="' + (ry + 7) + '">' + u.ratio.toFixed(1) + " times</text>";
      s += "</g>";
      return s + "</svg>";
    }

    /* ------------------------------------------------ 3. what the model knows
       (a) against the closing price, in nats: alone and blended, each drawn
       from the price (zero) out to where it lands. */
    function knowsClose(b, W, sfx) {
      var wide = W > 620;
      var lab = wide ? 0.27 : 0, rt = wide ? 0.12 : 0.18, lo = -0.035, hi = 0.01;
      function fx(v) { return lab + (v - lo) / (hi - lo) * (1 - lab - rt); }
      var rows = [
        { v: b.alone, lo: b.alone_lo, hi: b.alone_hi, name: "The model on its own", sub: signed(b.alone_yearly, 4) + " when refit yearly" },
        { v: b.gain, lo: b.gain_lo, hi: b.gain_hi, name: "Blended into the price", sub: "at a weight of " + b.lambda + ", " + fmtInt(b.priced) + " bouts" }
      ];
      var top = 32, rowH = wide ? 54 : 70;
      function rowY(i) { return wide ? top + i * rowH + rowH / 2 : top + i * rowH + rowH - 22; }
      var axisY = top + rows.length * rowH + 2, H = axisY + 40;
      var s = '<svg class="bx-svg kn-svg" width="100%" height="' + H + '" role="img" aria-labelledby="knc-t' + sfx + ' knc-d' + sfx + '">' +
        '<title id="knc-t' + sfx + '">The model against the closing price, in nats</title>' +
        '<desc id="knc-d' + sfx + '">On its own the model trails the closing price by ' + Math.abs(b.alone).toFixed(4) + ' nats, 95% interval ' + signed(b.alone_lo, 4) + ' to ' + signed(b.alone_hi, 4) + '. Blended into the price at a weight of ' + b.lambda + ' it improves the price by ' + signed(b.gain, 4) + ', interval ' + signed(b.gain_lo, 4) + ' to ' + signed(b.gain_hi, 4) + ', on ' + fmtInt(b.priced) + ' priced bouts.</desc>';
      s += '<text class="bx-k" x="' + pc(fx(lo)) + '" y="12">against the closing price, in nats</text>';
      s += '<text class="bx-k is-mid is-b" x="' + pc(fx(0)) + '" y="' + (top - 10) + '">the price</text>';
      [-0.03, -0.02, -0.01, 0, 0.01].forEach(function (v) {
        var x = pc(fx(v));
        s += '<line class="bx-g' + (v === 0 ? " is-0" : "") + '" x1="' + x + '" x2="' + x + '" y1="' + (top - 4) + '" y2="' + axisY + '"/>';
        s += '<text class="bx-n" x="' + x + '" y="' + (axisY + 17) + '">' + (v === 0 ? "0" : signed(v, 2)) + "</text>";
      });
      s += '<text class="bx-dir" x="' + pc(fx(lo)) + '" y="' + (axisY + 34) + '">← worse than the price</text>';
      s += '<text class="bx-dir is-r" x="' + pc(fx(hi)) + '" y="' + (axisY + 34) + '">better →</text>';
      rows.forEach(function (r, i) {
        var y = rowY(i), x = fx(r.v);
        if (wide) {
          s += '<text class="bx-lab is-s" x="0" y="' + (y - 2) + '">' + r.name + "</text>";
          s += '<text class="bx-sub" x="0" y="' + (y + 13) + '">' + r.sub + "</text>";
        } else {
          s += '<text class="bx-lab is-s" x="0" y="' + (y - 28) + '">' + r.name + "</text>";
          s += '<text class="bx-sub" x="0" y="' + (y - 13) + '">' + r.sub + "</text>";
        }
        s += '<g class="kn-m" style="--i:' + i + '"' + mv(fx(0), x) + ">";
        s += '<line class="kn-ci" x1="' + pc(fx(r.lo)) + '" x2="' + pc(fx(r.hi)) + '" y1="' + y + '" y2="' + y + '"/>';
        s += '<line class="kn-ci" x1="' + pc(fx(r.lo)) + '" x2="' + pc(fx(r.lo)) + '" y1="' + (y - 6) + '" y2="' + (y + 6) + '"/>';
        s += '<line class="kn-ci" x1="' + pc(fx(r.hi)) + '" x2="' + pc(fx(r.hi)) + '" y1="' + (y - 6) + '" y2="' + (y + 6) + '"/>';
        s += '<rect class="kn-dot" x="' + pc(x) + '" y="' + (y - 5) + '" width="10" height="10" transform="translate(-5 0)"/>';
        s += "</g>";
        s += '<text class="bx-v kn-v' + (r.v < 0 ? " is-neg" : "") + '" style="--i:' + i + '" x="100%" y="' + (y + 6) + '">' + signed(r.v, 4) + "</text>";
      });
      return s + "</svg>";
    }

    /* (b) five forecasts of the same fights, by log-loss (report 9.1): the
       model alone, the opening price, the open with the model blended in, the
       closing price, and the close with the model blended in. Further right
       is better. The price learns between its open and its close; the run on
       the blended open is how much of that the model already had, and the
       dotted rest is what only the close knew. The market's own prices are
       filled, the forecasts with the model in them are rings. The home page
       draws this figure too, so its classes live in site.css. */
    function forecasts(c, W, sfx) {
      var wide = W > 620, rows = c.rows;
      var lo = 0.362, hi = 0.332;                      // log-loss: worse at the left, better at the right
      var lab = wide ? 0.27 : 0, rt = wide ? 0.1 : 0.19;
      function fx(v) { return lab + (lo - v) / (lo - hi) * (1 - lab - rt); }
      function at(k) { for (var n = 0; n < rows.length; n++) if (rows[n].key === k) return n; return -1; }
      var top = 34, rowH = wide ? 46 : 64;
      function rowY(n) { return wide ? top + n * rowH + rowH / 2 : top + n * rowH + rowH - 18; }
      var axisY = top + rows.length * rowH + (wide ? 6 : 2), H = axisY + 42;
      var iO = at("open"), iB = at("open+"), iC = at("close");
      var xO = fx(rows[iO].ll), xB = fx(rows[iB].ll), xC = fx(rows[iC].ll);
      var share = Math.round(c.share * 100) + "% of the way to the close";
      var s = '<svg class="fc-svg" width="100%" height="' + H + '" role="img" aria-labelledby="fc-t' + sfx + ' fc-d' + sfx + '">' +
        '<title id="fc-t' + sfx + '">Five forecasts of the same ' + fmtInt(c.bouts) + ' fights, by log-loss</title>' +
        '<desc id="fc-d' + sfx + '">Log-loss on the same ' + fmtInt(c.bouts) + ' fights, ' + c.window + ', where lower is better. ' +
        rows.map(function (r) { return r.name + (r.sub ? " " + r.sub : "") + ", " + r.ll.toFixed(4); }).join("; ") +
        '. Blended into the opening price, the model moves it ' + share + '.</desc>';
      s += '<text class="fc-k" x="' + pc(fx(lo)) + '" y="12">log-loss, lower is better</text>';
      [0.36, 0.355, 0.35, 0.345, 0.34, 0.335].forEach(function (v, k) {
        var x = pc(fx(v));
        s += '<line class="fc-g" x1="' + x + '" x2="' + x + '" y1="' + (top - 4) + '" y2="' + axisY + '"/>';
        if (wide || k % 2 === 0) s += '<text class="fc-n" x="' + x + '" y="' + (axisY + 17) + '">' + v.toFixed(3) + "</text>";
      });
      s += '<text class="fc-dir" x="' + pc(fx(lo)) + '" y="' + (axisY + 35) + '">← worse</text>';
      s += '<text class="fc-dir is-r" x="' + pc(fx(hi)) + '" y="' + (axisY + 35) + '">better →</text>';
      rows.forEach(function (r, n) {
        var y = rowY(n), price = r.key === "open" || r.key === "close";
        if (wide) {
          s += '<text class="fc-lab" x="0" y="' + (r.sub ? y - 2 : y + 5) + '">' + r.name + "</text>";
          if (r.sub) s += '<text class="fc-sub" x="0" y="' + (y + 13) + '">' + r.sub + "</text>";
        } else {
          s += '<text class="fc-lab" x="0" y="' + (y - 14) + '">' + r.name + (r.sub ? ' <tspan class="fc-sub">' + r.sub + "</tspan>" : "") + "</text>";
        }
        s += '<line class="fc-row" x1="' + pc(fx(lo)) + '" x2="' + pc(fx(hi)) + '" y1="' + y + '" y2="' + y + '"/>';
        if (n === iB) {
          // the open and the close, carried to this row; the run is what the model already had
          s += '<line class="fc-guide" x1="' + pc(xO) + '" x2="' + pc(xO) + '" y1="' + rowY(iO) + '" y2="' + y + '"/>';
          s += '<line class="fc-guide" x1="' + pc(xC) + '" x2="' + pc(xC) + '" y1="' + y + '" y2="' + rowY(iC) + '"/>';
          s += '<line class="fc-rest" x1="' + pc(xB) + '" x2="' + pc(xC) + '" y1="' + y + '" y2="' + y + '"/>';
          s += '<line class="fc-run" x1="' + pc(xO) + '" x2="' + pc(xB) + '" y1="' + y + '" y2="' + y + '"/>';
          if (wide) s += '<text class="fc-ann" x="' + pc(xB) + '" dx="-14" y="' + (y - 10) + '" text-anchor="end">' + share + "</text>";
          else s += '<text class="fc-ann" x="' + pc(xO) + '" y="' + (y + 22) + '">' + share + "</text>";
        }
        s += '<circle class="fc-dot fc-m' + (price ? " is-price" : "") + '" style="--i:' + n + '" cx="' + pc(fx(r.ll)) + '" cy="' + y + '" r="5.5"/>';
        s += '<text class="fc-v fc-m" style="--i:' + n + '" x="100%" y="' + (y + 5) + '">' + r.ll.toFixed(4) + "</text>";
      });
      return s + "</svg>";
    }

    /* ------------------------------------------------ 4. the post-bell leak */
    function leak(k, W, sfx) {
      var wide = W > 620;
      var lab = wide ? 0.27 : 0, rt = 0.005;
      function fx(v) { return lab + v * (1 - lab - rt); }
      var rows = [
        { v: k.recorded, name: "Judges recorded" },
        { v: k.not_recorded, name: "Judges not recorded" }
      ];
      var top = 34, rowH = wide ? 60 : 74;
      function rowY(i) { return wide ? top + i * rowH + rowH / 2 : top + i * rowH + rowH - 24; }
      var axisY = top + rows.length * rowH + 2, H = axisY + 24;
      var s = '<svg class="bx-svg lk-svg" width="100%" height="' + H + '" role="img" aria-labelledby="lk-t' + sfx + ' lk-d' + sfx + '">' +
        '<title id="lk-t' + sfx + '">Probability that a fight ended early, by whether its judges were recorded</title>' +
        '<desc id="lk-d' + sfx + '">Where judges were recorded, ' + k.recorded + '; where they were not, ' + k.not_recorded + '. A control on ' + fmtInt(k.events) + ' events confirmed it was the outcome and not the crawler.</desc>';
      s += '<text class="bx-k" x="' + pc(fx(0)) + '" y="12">probability the fight ended early</text>';
      for (var i = 0; i <= 10; i++) {
        var v = i / 10, x = pc(fx(v));
        s += '<line class="lk-t" x1="' + x + '" x2="' + x + '" y1="' + axisY + '" y2="' + (axisY + (i % 5 === 0 ? 8 : 4)) + '"/>';
        if (i % 5 === 0) s += '<text class="bx-n' + (i === 0 ? " is-first" : i === 10 ? " is-end" : "") + '" x="' + x + '" y="' + (axisY + 22) + '">' + (i === 0 ? "0" : i === 10 ? "1" : "0.5") + "</text>";
      }
      s += '<line class="lk-axis" x1="' + pc(fx(0)) + '" x2="' + pc(fx(1)) + '" y1="' + axisY + '" y2="' + axisY + '"/>';
      rows.forEach(function (r, i) {
        var y = rowY(i);
        if (wide) s += '<text class="bx-lab" x="0" y="' + (y + 6) + '">' + r.name + "</text>";
        else s += '<text class="bx-lab" x="0" y="' + (y - 22) + '">' + r.name + "</text>";
        s += '<rect class="lk-box" x="' + pc(fx(0)) + '" y="' + (y - 13) + '" width="' + pc(fx(1) - fx(0)) + '" height="26"/>';
        for (var j = 1; j < 10; j++) s += '<line class="lk-g" x1="' + pc(fx(j / 10)) + '" x2="' + pc(fx(j / 10)) + '" y1="' + (y - 13) + '" y2="' + (y - (j === 5 ? 5 : 9)) + '"/>';
        s += '<rect class="lk-fill" style="--i:' + i + '" x="' + pc(fx(0)) + '" y="' + (y - 13) + '" width="' + pc(fx(r.v) - fx(0)) + '" height="26"/>';
        s += '<text class="lk-v" style="--i:' + i + '" x="' + pc(fx(r.v)) + '" dx="10" y="' + (y + 8) + '">' + r.v.toFixed(3) + "</text>";
      });
      return s + "</svg>";
    }

    /* ------------------------------------------------ 5. the checks, on one log axis
       An e-value axis from 0.01 at the figure's left edge to 1,000 at its
       right (the four-window gauge's top of scale), graduated at m x 10^k,
       with the bar at 20. Each e-value starts at 1, no evidence either way. */
    function checks(W, sfx) {
      var HI = F.GAUGE_HI || 1000, L0 = Math.log10(0.01);
      function gx(v) { return (Math.log10(Math.min(v, HI)) - L0) / (Math.log10(HI) - L0); }
      var wide = W > 620, x1 = gx(1);
      var rows = [
        { name: "The result, at the opening price over 2023–2025", off: "3.9 × 10<tspan class=\"sup\" dy=\"-6\">8</tspan>" },
        { name: "Retrained without anything settled in fight week", off: "1.2 × 10<tspan class=\"sup\" dy=\"-6\">8</tspan>" },
        { name: "Price-only controls, no model in them", marks: [0.25, 1.2] },
        { name: "A simulated null, on average", marks: [0.2], cap: "mean e 0.20" },
        { name: "Sixteen classic price biases, at the closing price", under: true }
      ];
      var top = 46, rowH = wide ? 50 : 62;
      function rowY(i) { return top + i * rowH + rowH - (wide ? 18 : 22); }
      var axisY = top + rows.length * rowH + 6, H = axisY + 28;
      var xb = gx(20);
      var s = '<svg class="bx-svg ck-svg" width="100%" height="' + H + '" role="img" aria-labelledby="ck-t' + sfx + ' ck-d' + sfx + '">' +
        '<title id="ck-t' + sfx + '">The checks built to kill the opening-price result, as e-values on a log scale</title>' +
        '<desc id="ck-d' + sfx + '">A logarithmic e-value axis from 0.01 to 1,000, with the bar at 20. The result at the opening price over 2023 to 2025, e = 3.9 times 10 to the 8, and the same retrained without anything settled in fight week, 1.2 times 10 to the 8, are both off the scale to the right. Price-only controls with no model in them score 0.25 and 1.2. A simulated null averages 0.20. None of sixteen classic price biases, tested at the closing price, reached 20.</desc>';
      // the bar
      s += '<line class="ck-bar" x1="' + pc(xb) + '" x2="' + pc(xb) + '" y1="' + (top - 22) + '" y2="' + axisY + '"/>';
      s += '<text class="bx-k is-b is-mid" x="' + pc(xb) + '" y="' + (top - 28) + '">the bar, 20</text>';
      rows.forEach(function (r, i) {
        var y = rowY(i);
        s += '<line class="ck-row" x1="0" x2="100%" y1="' + y + '" y2="' + y + '"/>';
        s += '<text class="ck-lab" x="0" y="' + (y - 9) + '">' + r.name + "</text>";
        if (r.off) {
          s += '<line class="ck-trail" style="--i:' + i + '" x1="' + pc(x1) + '" x2="100%" y1="' + y + '" y2="' + y + '"/>';
          s += '<g class="ck-m ck-off" style="--i:' + i + '"' + mv(x1, 1) + '><svg x="100%" y="' + y + '" overflow="visible"><path class="ck-stop" d="M-13 -6 L0 0 L-13 6 Z"/></svg></g>';
          s += '<text class="ck-v is-hit" style="--i:' + i + '" x="100%" dx="' + (wide ? -20 : 0) + '" y="' + (wide ? y - 9 : y + 19) + '" text-anchor="end">e = ' + r.off + "</text>";
          if (wide) s += '<text class="ck-off-t" style="--i:' + i + '" x="100%" dx="-20" y="' + (y + 17) + '" text-anchor="end">off this scale</text>';
        } else if (r.marks) {
          r.marks.forEach(function (v, j) {
            var x = gx(v);
            s += '<g class="ck-m" style="--i:' + (i + j * 0.5) + '"' + mv(x1, x) + '><circle class="ck-dot" cx="' + pc(x) + '" cy="' + y + '" r="5.5"/></g>';
            s += '<text class="ck-v" style="--i:' + i + '" x="' + pc(x) + '" y="' + (y + 21) + '" text-anchor="middle">' + (r.cap || String(v)) + "</text>";
          });
        } else if (r.under) {
          s += '<g class="ck-under" style="--i:' + i + '"><line class="ck-lim" x1="' + pc(xb) + '" x2="' + pc(xb) + '" y1="' + (y - 8) + '" y2="' + (y + 8) + '"/>' +
            '<svg x="' + pc(xb) + '" y="' + y + '" overflow="visible"><path class="ck-lim-a" d="M-4 0 L-44 0 M-36 -5 L-44 0 L-36 5"/></svg></g>';
          s += '<text class="ck-v" style="--i:' + i + '" x="' + pc(xb) + '" dx="' + (wide ? -52 : -8) + '" y="' + (wide ? y + 5 : y + 21) + '" text-anchor="end">none reached 20</text>';
        }
      });
      // the axis, graduated at m x 10^k
      s += '<line class="ck-axis" x1="0" x2="100%" y1="' + axisY + '" y2="' + axisY + '"/>';
      F.gridValues().forEach(function (g) {
        if (g.v > HI) return;
        var c = F.gridClass(g), len = (c === "gd" || c === "g1" || c === "ge" || g.v === 0.01) ? 9 : (c === "gb" || c === "gh") ? 6 : 3;
        s += '<line class="ck-tk" x1="' + pc(gx(g.v)) + '" x2="' + pc(gx(g.v)) + '" y1="' + axisY + '" y2="' + (axisY + len) + '"/>';
      });
      (wide ? [0.01, 0.1, 1, 10, 100] : [0.01, 0.1, 1, 10]).forEach(function (v) {
        s += '<text class="bx-n' + (v === 0.01 ? " is-first" : "") + '" x="' + pc(gx(v)) + '" y="' + (axisY + 24) + '">' + v + "</text>";
      });
      s += '<text class="bx-n is-b" x="' + pc(xb) + '" y="' + (axisY + 24) + '">20</text>';
      s += '<text class="bx-n is-end" x="100%" y="' + (axisY + 24) + '">1,000</text>';
      return s + "</svg>";
    }

    /* ------------------------------------------------ 6. the random search: the best of 200, where it was chosen and where it was not
       Drawn for a narrow tile (270 to 420px): each column's heading is set
       from its own edge of the figure, so the two never meet, and the
       columns sit 27% in, which leaves room for the values beside the dots. */
    function search(W, sfx) {
      var xa = 0.27, xb = 0.73, yTop = 62, per = 46;             // 46px per 0.001
      function y(v) { return r2(yTop + (0.002 - v) / 0.001 * per); }
      var y0 = y(0), ya = y(0.0017), yb = y(-0.0004), H = y(-0.001) + 30;
      var s = '<svg class="bx-svg se-svg" width="100%" height="' + H + '" role="img" aria-labelledby="se-t' + sfx + ' se-d' + sfx + '">' +
        '<title id="se-t' + sfx + '">The best of 200 random configurations, against the model already in use</title>' +
        '<desc id="se-d' + sfx + '">Ranked on 2021 to 2023, where it was chosen, it led the model already in use by 0.0017. Scored once on 2023 to 2026, which the search never saw, it trailed by 0.0004.</desc>';
      s += '<text class="bx-lab is-s is-first" x="0" y="16">where it was chosen</text>';
      s += '<text class="bx-sub is-first" x="0" y="32">ranked on 2021–2023</text>';
      s += '<text class="bx-lab is-s is-end" x="100%" y="16">where it was not</text>';
      s += '<text class="bx-sub is-end" x="100%" y="32">scored once, 2023–2026</text>';
      [xa, xb].forEach(function (x) {
        s += '<line class="se-ax" x1="' + pc(x) + '" x2="' + pc(x) + '" y1="' + (yTop - 8) + '" y2="' + y(-0.001) + '"/>';
        [0.002, 0.001, 0, -0.001].forEach(function (v) {
          s += '<line class="se-tk" x1="' + pc(x - 0.02) + '" x2="' + pc(x + 0.02) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
        });
      });
      s += '<line class="se-zero" x1="4%" x2="96%" y1="' + y0 + '" y2="' + y0 + '"/>';
      s += '<line class="se-line" pathLength="1" x1="' + pc(xa) + '" x2="' + pc(xb) + '" y1="' + ya + '" y2="' + yb + '"/>';
      s += '<circle class="se-dot" cx="' + pc(xa) + '" cy="' + ya + '" r="5"/>';
      s += '<circle class="se-dot se-b" cx="' + pc(xb) + '" cy="' + yb + '" r="5"/>';
      s += '<text class="bx-v se-v" x="' + pc(xa) + '" dx="-11" y="' + (ya + 5) + '" text-anchor="end">+0.0017</text>';
      s += '<text class="bx-v se-v se-vb is-neg is-first" x="' + pc(xb) + '" dx="11" y="' + (yb + 5) + '">−0.0004</text>';
      return s + "</svg>";
    }

    /* ------------------------------------------------ 7. the forward test, as a time ruler
       From the freeze on 24 September 2026 to four years on, so the close on
       25 September 2029 and the ranges the protocol gives for a pass, at 60 to
       90 qualifying fights a year, sit at their dates. Each row is a size the
       true effect could have: the 2016 to 2026 average, about half of it, and
       none. Above: the calendar; below: years since the freeze. The page
       script adds today. */
    function live(L, W, sfx) {
      var wide = W > 620;
      var DAY = 864e5;
      function d(s) { var p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
      var t0 = d(L.frozen), tc = d(L.closes), t4 = Date.UTC(2030, 8, 24);
      function yrs(n) { return Date.UTC(2026 + n, 8, 24); }
      var lab = wide ? 0.2 : 0, padR = wide ? 0.05 : 0.07;
      function tx(t) { return lab + (t - t0) / (t4 - t0) * (1 - lab - padR); }
      var yEv = 13, yYr = 52, yAx = 60, top = yAx + 42, rowH = wide ? 50 : 62;
      function rowY(i) { return top + i * rowH + rowH - (wide ? 22 : 18); }
      var rows = [
        { name: "As in 2016–2026", sub: "the rule’s average", a: 1, b: 2, say: "one to two years" },
        { name: "About half that", sub: "", a: 3, b: 4, say: "three to four years" },
        { name: "None", sub: "", never: true, say: "never" }
      ];
      var yB = rowY(rows.length - 1) + 30, H = yB + 44;
      var s = '<svg class="bx-svg lv2-svg" width="100%" height="' + H + '" role="img" aria-labelledby="lt-t' + sfx + ' lt-d' + sfx + '">' +
        '<title id="lt-t' + sfx + '">The forward test, from its freeze to its close</title>' +
        '<desc id="lt-d' + sfx + '">Frozen and pushed on 24 September 2026; it closes on 25 September 2029. At 60 to 90 qualifying fights a year, an effect as large as the rule\'s 2016 to 2026 average would pass one to two years after the freeze, before the close; one about half that size would take three to four, so the test would probably close before it passed; with no effect it would never pass.</desc>' +
        "<defs>" + hatch("lt-h" + sfx) + "</defs>";
      var xf = tx(t0), xc = tx(tc);
      // freeze and close
      s += '<line class="lt-ev" x1="' + pc(xf) + '" x2="' + pc(xf) + '" y1="4" y2="' + yB + '"/>';
      s += '<line class="lt-ev is-c" x1="' + pc(xc) + '" x2="' + pc(xc) + '" y1="4" y2="' + yB + '"/>';
      if (wide) {
        s += '<text class="lt-evt" x="' + pc(xf) + '" dx="8" y="' + (yEv - 2) + '">Frozen and pushed</text>';
        s += '<text class="lt-evs" x="' + pc(xf) + '" dx="8" y="' + (yEv + 13) + '">24 September 2026</text>';
        s += '<text class="lt-evt" x="' + pc(xc) + '" dx="8" y="' + (yEv - 2) + '">The test closes</text>';
        s += '<text class="lt-evs" x="' + pc(xc) + '" dx="8" y="' + (yEv + 13) + '">25 September 2029</text>';
      } else {
        s += '<text class="lt-evt" x="' + pc(xf) + '" dx="6" y="' + (yEv - 2) + '">Frozen</text>';
        s += '<text class="lt-evs" x="' + pc(xf) + '" dx="6" y="' + (yEv + 12) + '">24 Sep 2026</text>';
        s += '<text class="lt-evt" x="' + pc(xc) + '" dx="-6" text-anchor="end" y="' + (yEv - 2) + '">Closes</text>';
        s += '<text class="lt-evs" x="' + pc(xc) + '" dx="-6" text-anchor="end" y="' + (yEv + 12) + '">25 Sep 2029</text>';
      }
      // the calendar: months, and 1 January of each year
      for (var y = 2026, m = 9; ; ) {
        var t = Date.UTC(y, m, 1);
        if (t > t4) break;
        var jan = m === 0, x = tx(t);
        s += '<line class="lt-tk' + (jan ? " is-y" : "") + '" x1="' + pc(x) + '" x2="' + pc(x) + '" y1="' + yAx + '" y2="' + (yAx + (jan ? 11 : 5)) + '"/>';
        if (jan) s += '<text class="bx-n is-b" x="' + pc(x) + '" y="' + yYr + '">' + y + "</text>";
        m++; if (m === 12) { m = 0; y++; }
      }
      // the axis: heavy while the test is open, light after it closes
      s += '<line class="lt-axis" x1="' + pc(xf) + '" x2="' + pc(tx(t4)) + '" y1="' + yAx + '" y2="' + yAx + '"/>';
      s += '<line class="lt-open" x1="' + pc(xf) + '" x2="' + pc(xc) + '" y1="' + (yAx - 1) + '" y2="' + (yAx - 1) + '"/>';
      if (wide) {
        s += '<text class="bx-k" x="0" y="' + (yAx + 4) + '">the calendar</text>';
        s += '<text class="bx-k" x="0" y="' + (top - 6) + '">if the true effect is</text>';
      }
      // today, placed by the page script
      s += '<g class="lt-today" data-t0="' + t0 + '" data-t4="' + t4 + '" data-a="' + r2(tx(t0) * 1e4) / 1e4 + '" data-b="' + r2(tx(t4) * 1e4) / 1e4 + '" display="none">' +
        '<line class="lt-now" x1="0" x2="0" y1="' + (yAx - 10) + '" y2="' + yB + '"/>' +
        '<text class="lt-nowt" x="0" dx="6" y="' + (yAx + 22) + '">today</text></g>';
      rows.forEach(function (r, i) {
        var y = rowY(i);
        if (wide) {
          s += '<text class="bx-lab" x="0" y="' + (r.sub ? y - 2 : y + 5) + '">' + r.name + "</text>";
          if (r.sub) s += '<text class="bx-sub" x="0" y="' + (y + 13) + '">' + r.sub + "</text>";
        } else {
          // set off the freeze line, which on a phone runs down the figure's left edge
          s += '<text class="bx-lab is-s" x="0" dx="8" y="' + (y - 16) + '">' + r.name + (r.sub ? ' <tspan class="bx-sub">' + r.sub + "</tspan>" : "") + "</text>";
        }
        s += '<line class="lt-row" x1="' + pc(xf) + '" x2="' + pc(tx(t4)) + '" y1="' + y + '" y2="' + y + '"/>';
        if (r.never) {
          s += '<line class="lt-never" style="--i:' + i + '" x1="' + pc(xf) + '" x2="100%" y1="' + y + '" y2="' + y + '"/>';
          s += '<svg class="lt-na" style="--i:' + i + '" x="100%" y="' + y + '" overflow="visible"><path d="M-10 -5 L0 0 L-10 5" /></svg>';
          s += '<text class="lt-say" style="--i:' + i + '" x="100%" dx="-2" y="' + (y - 10) + '" text-anchor="end">' + r.say + "</text>";
        } else {
          var a = tx(yrs(r.a)), b = tx(yrs(r.b));
          s += '<rect class="lt-band" style="--i:' + i + '" x="' + pc(a) + '" y="' + (y - 8) + '" width="' + pc(b - a) + '" height="16" fill="url(#lt-h' + sfx + ')"/>';
          // beside the band; on a phone a label right of it would run into the close, so it goes under the band
          var right = b < 0.8, under = !wide && right;
          s += '<text class="lt-say" style="--i:' + i + '" x="' + pc(under ? a : right ? b : a) + '" dx="' + (under ? 0 : right ? 10 : -10) + '" y="' + (y + (under ? 25 : 5)) + '"' + (right ? "" : ' text-anchor="end"') + ">" + r.say + "</text>";
        }
      });
      // years since the freeze
      s += '<line class="lt-axis is-b" x1="' + pc(xf) + '" x2="' + pc(tx(t4)) + '" y1="' + yB + '" y2="' + yB + '"/>';
      for (var n = 0; n <= 4; n++) {
        var xn = tx(yrs(n));
        s += '<line class="lt-tk is-y" x1="' + pc(xn) + '" x2="' + pc(xn) + '" y1="' + yB + '" y2="' + (yB + 9) + '"/>';
        s += '<text class="bx-n' + (n === 0 ? " is-first" : "") + '" x="' + pc(xn) + '" y="' + (yB + 25) + '">' + (n === 0 ? "0" : n === 1 ? "1 year" : n + (wide ? " years" : "")) + "</text>";
      }
      if (wide) s += '<text class="bx-k" x="0" y="' + (yB + 4) + '">years since the freeze</text>';
      else s += '<text class="bx-k" x="0" y="' + (yB + 40) + '">years since the freeze</text>';
      return s + "</svg>";
    }

    return { tiers: tiers, knowsClose: knowsClose, forecasts: forecasts, leak: leak, checks: checks, search: search, live: live };
  }

  function markers(F, data) {
    var B = data.boxing, R = build(F);
    return {
      vbTiersWide: function () { return R.tiers(B.unseen, 1000, "-w"); },
      vbTiersNarrow: function () { return R.tiers(B.unseen, 358, "-n"); },
      vbKnowsWide: function () { return R.knowsClose(B.blend, 1000, "-w"); },
      vbKnowsNarrow: function () { return R.knowsClose(B.blend, 358, "-n"); },
      vbForecastsWide: function () { return R.forecasts(B.forecasts, 1000, "-w"); },
      vbForecastsNarrow: function () { return R.forecasts(B.forecasts, 358, "-n"); },
      vbLeakWide: function () { return R.leak(B.leak, 1000, "-w"); },
      vbLeakNarrow: function () { return R.leak(B.leak, 358, "-n"); },
      vbChecksWide: function () { return R.checks(1300, "-w"); },
      vbChecksNarrow: function () { return R.checks(358, "-n"); },
      vbSearch: function () { return R.search(320, ""); },
      vbLiveWide: function () { return R.live(B.live, 1300, "-w"); },
      vbLiveNarrow: function () { return R.live(B.live, 358, "-n"); }
    };
  }

  var api = { build: build, markers: markers };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FigVB = api;
})(this);
