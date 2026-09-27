/* /work/zacks-ibkr/: one run through the schematic.

   The drawing in the HTML is the state after a run (every stage in full, the
   interlocks ticked, the dot parked at the dry-run switch), so without
   JavaScript or with motion reduced that is what shows. Here the stages go
   faint, and when the tile is well into view a dot carries one run through
   them: it stops at each stage, ticks the two interlocks, and halts at the
   switch, which is on, so nothing is sent. Then "Run it again" appears
   (its place is kept from the start, so nothing moves when it does). */
(function () {
  "use strict";
  var RP = window.RP, fig = document.querySelector("[data-run]");
  if (!fig || !RP || RP.still() || !("IntersectionObserver" in window)) return;
  var tween = RP.tween, EIO = RP.EIO;
  var replay = fig.querySelector(".zi-replay");
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var runs = $$(".zr-svg", fig).map(function (svg) {
    var axis = svg.getAttribute("data-axis"), tr = svg.querySelector(".zr-tr"), tok = svg.querySelector(".zr-tok");
    var a = axis === "x" ? ["x1", "x2"] : ["y1", "y2"], dot = tok.querySelector("circle"), dk = axis === "x" ? "cx" : "cy";
    return {
      svg: svg, axis: axis, tr: tr, tok: tok, dot: dot, dk: dk,
      k2: a[1], tokK: axis === "x" ? "x" : "y",
      from: tr.getAttribute(a[0]), to: tr.getAttribute(a[1]), tokAt: tok.getAttribute(axis === "x" ? "x" : "y"),
      park: dot.getAttribute(dk),
      stages: $$(".zr-st[data-at]", svg),
      lamps: $$(".zr-lamp", svg)
    };
  });
  function stagePx(r, el, key) {
    var v = parseFloat(el.getAttribute("data-" + key));
    return r.axis === "x" ? v * r.svg.getBoundingClientRect().width / 100 : v;
  }
  var PARK = 16;                                              // the dot rests this far short of the switch
  function place(r, p) {
    r.tr.setAttribute(r.k2, p.toFixed(1));
    r.tok.setAttribute(r.tokK, p.toFixed(1));
    r.stages.forEach(function (st) { if (p >= stagePx(r, st, "lo") - 8) st.classList.add("is-done"); });
  }
  function arm() {
    fig.classList.remove("is-end", "is-going");
    fig.classList.add("is-armed");
    runs.forEach(function (r) {
      r.stages.forEach(function (st) { st.classList.remove("is-done", "is-on"); });
      r.lamps.forEach(function (l) { l.classList.remove("is-lit"); });
      r.tr.setAttribute(r.k2, r.from);
      r.tok.setAttribute(r.tokK, r.from);
      r.dot.setAttribute(r.dk, "0");
    });
  }
  function settle() {
    runs.forEach(function (r) {
      r.tr.setAttribute(r.k2, r.to);
      r.tok.setAttribute(r.tokK, r.tokAt);
      r.dot.setAttribute(r.dk, r.park);
      r.stages.forEach(function (st) { st.classList.add("is-done"); st.classList.remove("is-on"); });
      r.lamps.forEach(function (l) { l.classList.add("is-lit"); });
    });
    fig.classList.add("is-end");
  }

  var timers = [], busy = false;
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

  /* one run, through whichever drawing is on screen */
  function go() {
    var r = runs.filter(function (x) { return x.svg.getBoundingClientRect().width > 0; })[0];
    if (!r) { done(); return; }
    busy = true;
    fig.classList.add("is-going");
    var stops = r.stages.map(function (st) { return { el: st, c: stagePx(r, st, "c") }; });
    var last = stops.pop();                                   // the switch: the run ends just short of it
    var pts = [parseFloat(r.from)].concat(stops.map(function (s) { return s.c; }), [last.c - PARK]);
    var i = 0;
    function leg() {
      var p0 = pts[i], p1 = pts[i + 1], d = Math.abs(p1 - p0);
      var ms = Math.max(320, Math.min(640, 170 + d * 1.9));
      tween(ms, EIO, function (e) { place(r, p0 + (p1 - p0) * e); }, function () {
        i++;
        if (i >= pts.length - 1) { last.el.classList.add("is-done"); later(260, function () { fig.classList.add("is-end"); later(1000, done); }); return; }
        var st = stops[i - 1].el;
        st.classList.add("is-on");
        var lamps = $$(".zr-lamp", st), dwell = lamps.length ? 640 : 260;
        lamps.forEach(function (l, j) { later(140 + j * 220, function () { l.classList.add("is-lit"); }); });
        later(dwell, function () { st.classList.remove("is-on"); leg(); });
      });
    }
    later(380, leg);
  }
  function done() {
    // hand the drawing back in its own units, so a resize keeps it true
    settle();
    fig.classList.remove("is-armed", "is-going");
    busy = false;
    if (replay) replay.classList.remove("is-away");
  }

  if (replay) {
    // it takes its place now, unseen, so nothing moves when it appears after the first run
    replay.classList.add("is-away");
    replay.hidden = false;
    replay.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      timers.forEach(clearTimeout); timers = [];
      replay.classList.add("is-away");
      arm();
      later(420, go);
    });
  }

  arm();
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.disconnect();
      go();
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.5 });   // once half the drawing is in view
  io.observe(fig.querySelector(".zi-draw"));
})();
