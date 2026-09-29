/* Figures for /work/indelible/.

   One schematic, pre-rendered into the page by tools/figures.mjs:
   - inLadderWide / inLadderNarrow: one topic from its lesson to retired, on
     indelible's default intervals. The lesson's same-day score is practice;
     the 2-day recheck is the first score that counts, and the one question it
     missed comes back after 1 day, 3 days, 1 week and 3 weeks. Time runs on a
     log scale of days (ln(1 + day)), so the widening gaps stay readable.
   The intervals are indelible's defaults (its README, "The method"); the
   scores are the example the product site uses, not a measurement. Marks that
   count (from the recheck on) are the site's blue; the same-day mark is ink. */
(function (root) {
  "use strict";

  function f(n) { return String(Math.round(n * 100) / 100); }
  function text(c, x, y, s, anchor) {
    return '<text class="' + c + '" x="' + f(x) + '" y="' + f(y) + '"' + (anchor && anchor !== "start" ? ' text-anchor="' + anchor + '"' : "") + ">" + s + "</text>";
  }

  /* the stops: day, what happens, what it is worth, how its words are anchored on the wide figure */
  var STOPS = [
    { d: 0, day: "Day 0", a: "the lesson: 6 of 6", b: "practice only", counts: false, anchor: "start" },
    { d: 2, day: "Day 2", a: "the recheck: 3 of 4", b: "the first that counts", counts: true, anchor: "end" },
    { d: 3, day: "Day 3", a: "the miss, back", b: "passed", counts: true, anchor: "start" },
    { d: 6, day: "Day 6", b: "passed", counts: true, anchor: "middle" },
    { d: 13, day: "Day 13", b: "passed", counts: true, anchor: "middle" },
    { d: 34, day: "Day 34", a: "four passes on four days", b: "retired", counts: true, anchor: "end", last: true },
  ];
  /* the hop into each stop after the first */
  var HOPS = ["48 hours, cold", "+1 day", "+3 days", "+1 week", "+3 weeks"];
  var LN = Math.log(35);
  function at(d) { return Math.log(1 + d) / LN; }
  /* when the pen drawing the axis (160ms to 2060ms, at a steady pace) reaches a stop */
  function when(d) { return Math.round(160 + at(d) * 1900) + "ms"; }

  function desc() {
    return "One topic on indelible's default intervals, with time on a log scale. Day 0, the lesson: 6 of 6 on the drills, which is practice and does not count. " +
      "Day 2, 48 hours later and cold: the 2-day recheck, 3 of 4, the first score that counts. The question it missed comes back after 1 day (day 3), 3 days (day 6), 1 week (day 13) and 3 weeks (day 34), " +
      "passing each time, and after four passes on four different days it is retired. The scores are an example, not a measurement.";
  }

  /* wide: time runs left to right; hops arc over the axis */
  function ladderWide() {
    var W = 760, H = 204, x0 = 8, x1 = W - 8, y = 100;
    var X = STOPS.map(function (s) { return x0 + (x1 - x0) * at(s.d); });
    var s = '<svg class="il-svg" viewBox="0 0 ' + W + " " + H + '" width="100%" preserveAspectRatio="xMinYMin meet" role="img" aria-labelledby="il-t-w il-d-w">' +
      '<title id="il-t-w">One topic, from the lesson to retired</title><desc id="il-d-w">' + desc() + "</desc>";
    s += '<line class="il-axis" x1="' + f(x0) + '" y1="' + y + '" x2="' + f(x1) + '" y2="' + y + '" pathLength="1"/>';
    /* the hops */
    for (var i = 1; i < STOPS.length; i++) {
      var a = X[i - 1] + 9, b = X[i] - 9, mid = (a + b) / 2, lift = Math.min(58, 20 + (b - a) * 0.16);
      s += '<path class="il-hop' + (i === 1 ? " is-first" : "") + '" style="--t:' + when(STOPS[i].d) + '" d="M' + f(a) + "," + (y - 12) + " Q" + f(mid) + "," + f(y - 12 - lift * 2) + " " + f(b) + "," + (y - 12) + '" pathLength="1"/>';
      s += text("il-hl" + (i === 1 ? " is-first" : ""), mid, y - 20 - lift, HOPS[i - 1], "middle").replace("<text ", '<text style="--t:' + when(STOPS[i].d) + '" ');
    }
    /* the stops, and what each one is worth */
    STOPS.forEach(function (st, i) {
      var x = X[i], r = i < 2 || st.last ? 7 : 5.5;
      var tx = st.anchor === "start" ? x - r : st.anchor === "end" ? x + r : x;
      s += '<g class="il-stop' + (st.counts ? " is-counts" : " is-practice") + '" style="--t:' + when(st.d) + '">';
      s += '<circle class="il-m" cx="' + f(x) + '" cy="' + y + '" r="' + r + '"/>';
      s += text("il-day", tx, y + 34, st.day, st.anchor);
      if (st.a) s += text("il-a", tx, y + 54, st.a, st.anchor);
      if (st.b) s += text("il-b", tx, y + (st.a ? 72 : 54), st.b, st.anchor);
      s += "</g>";
    });
    return s + "</svg>";
  }

  /* narrow: time runs down the page; hops arc to the left of the axis, their names beside them */
  function ladderNarrow() {
    var W = 358, H = 452, y0 = 16, y1 = H - 40, x = 104;
    var Y = STOPS.map(function (s) { return y0 + (y1 - y0) * at(s.d); });
    var s = '<svg class="il-svg" viewBox="0 0 ' + W + " " + H + '" width="100%" preserveAspectRatio="xMinYMin meet" role="img" aria-labelledby="il-t-n il-d-n">' +
      '<title id="il-t-n">One topic, from the lesson to retired</title><desc id="il-d-n">' + desc() + "</desc>";
    s += '<line class="il-axis" x1="' + x + '" y1="' + f(y0) + '" x2="' + x + '" y2="' + f(y1) + '" pathLength="1"/>';
    for (var i = 1; i < STOPS.length; i++) {
      var a = Y[i - 1] + 9, b = Y[i] - 9, mid = (a + b) / 2, lift = Math.min(40, 10 + (b - a) * 0.22);
      s += '<path class="il-hop' + (i === 1 ? " is-first" : "") + '" style="--t:' + when(STOPS[i].d) + '" d="M' + (x - 12) + "," + f(a) + " Q" + f(x - 12 - lift * 2) + "," + f(mid) + " " + (x - 12) + "," + f(b) + '" pathLength="1"/>';
      var label = i === 1 ? "48 hours" : HOPS[i - 1];
      s += text("il-hl" + (i === 1 ? " is-first" : ""), x - 20 - lift, mid + 4, label, "end").replace("<text ", '<text style="--t:' + when(STOPS[i].d) + '" ');
    }
    STOPS.forEach(function (st, i) {
      var y = Y[i], r = i < 2 || st.last ? 7 : 5.5;
      /* the recheck and the first return sit close: the recheck's words go above its mark's
         line and the return's on one line below it */
      var one = i === 1 || i === 2;
      s += '<g class="il-stop' + (st.counts ? " is-counts" : " is-practice") + '" style="--t:' + when(st.d) + '">';
      s += '<circle class="il-m" cx="' + x + '" cy="' + f(y) + '" r="' + r + '"/>';
      if (one) {
        if (i === 1) {
          s += '<text class="il-a" x="' + (x + 20) + '" y="' + f(y - 14) + '"><tspan class="il-day">' + st.day + "</tspan>  " + st.a + "</text>";
          s += text("il-b", x + 20, y + 4, st.b);
        } else {
          s += '<text class="il-a" x="' + (x + 20) + '" y="' + f(y + 10) + '"><tspan class="il-day">' + st.day + "</tspan>  " + st.a + ', <tspan class="il-b">' + st.b + "</tspan></text>";
        }
      } else {
        s += text("il-day", x + 20, y + 5, st.day);
        s += '<text class="il-a" x="' + (x + 20) + '" y="' + f(y + 23) + '">' + (st.a ? st.a + ", " : "") + (st.b ? '<tspan class="il-b">' + st.b + "</tspan>" : "") + "</text>";
      }
      s += "</g>";
    });
    return s + "</svg>";
  }

  var api = {
    markers: function () {
      return { inLadderWide: ladderWide, inLadderNarrow: ladderNarrow };
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FIN = api;
})(this);
