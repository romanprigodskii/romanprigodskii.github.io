/* /work/zacks-ibkr/: one run through the schematic.

   The drawing in the HTML is the state after a run (every stage inked, the
   token at the open dry-run switch), so without JavaScript or with motion
   reduced that is what shows. Here the stages go back to pencil, and when the
   figure is well into view a token carries one run through them: it stops at
   each stage, inks it, lights the two interlocks, and halts at the switch,
   which is open, so nothing is sent. It runs once. */
(function () {
  "use strict";
  var RP = window.RP, fig = document.querySelector("[data-run]");
  if (!fig || !RP || RP.still() || !("IntersectionObserver" in window)) return;
  var tween = RP.tween, EIO = RP.EIO;
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var runs = $$(".zr-svg", fig).map(function (svg) {
    var axis = svg.getAttribute("data-axis"), tr = svg.querySelector(".zr-tr"), tok = svg.querySelector(".zr-tok");
    var a = axis === "x" ? ["x1", "x2"] : ["y1", "y2"], rect = tok.querySelector("rect");
    return {
      svg: svg, axis: axis, tr: tr, tok: tok,
      k1: a[0], k2: a[1], tokK: axis === "x" ? "x" : "y",
      from: tr.getAttribute(a[0]), to: tr.getAttribute(a[1]), tokAt: tok.getAttribute(axis === "x" ? "x" : "y"),
      stages: $$(".zr-st[data-at]", svg),
      rect: rect, park: [rect.getAttribute("x"), rect.getAttribute("y")]
    };
  });
  function stagePx(r, el, key) {
    var v = parseFloat(el.getAttribute("data-" + key));
    return r.axis === "x" ? v * r.svg.getBoundingClientRect().width / 100 : v;
  }
  var PARK = 16;                                              // the token rests this far short of the switch
  function place(r, p) {
    r.tr.setAttribute(r.k2, (p + 5).toFixed(1));
    r.tok.setAttribute(r.tokK, p.toFixed(1));
    r.stages.forEach(function (st) { if (p >= stagePx(r, st, "lo") - 6) st.classList.add("is-done"); });
  }
  function arm() {
    fig.classList.add("is-armed");
    runs.forEach(function (r) {
      r.stages.forEach(function (st) { st.classList.remove("is-done", "is-on"); });
      $$(".zr-lamp", r.svg).forEach(function (l) { l.classList.remove("is-lit"); });
      r.tr.setAttribute(r.k2, r.from);
      r.tok.setAttribute(r.tokK, r.from);
      r.rect.setAttribute("x", "-5.5"); r.rect.setAttribute("y", "-5.5");
    });
  }
  function settle() {
    runs.forEach(function (r) {
      r.tr.setAttribute(r.k2, r.to);
      r.tok.setAttribute(r.tokK, r.tokAt);
      r.rect.setAttribute("x", r.park[0]); r.rect.setAttribute("y", r.park[1]);
      r.stages.forEach(function (st) { st.classList.add("is-done"); st.classList.remove("is-on"); });
      $$(".zr-lamp", r.svg).forEach(function (l) { l.classList.add("is-lit"); });
    });
    fig.classList.add("is-end");
  }

  /* one run, through whichever drawing is on screen */
  function go() {
    var r = runs.filter(function (x) { return x.svg.getBoundingClientRect().width > 0; })[0];
    if (!r) { settle(); return; }
    fig.classList.add("is-going");
    var stops = r.stages.map(function (st) { return { el: st, c: stagePx(r, st, "c") }; });
    var last = stops.pop();                                   // the switch: the run ends on its open contact
    var pts = [parseFloat(r.from)].concat(stops.map(function (s) { return s.c; }), [last.c - PARK]);
    var i = 0;
    function leg() {
      var p0 = pts[i], p1 = pts[i + 1], d = Math.abs(p1 - p0);
      var ms = Math.max(300, Math.min(620, 160 + d * 1.9));
      tween(ms, EIO, function (e) { place(r, p0 + (p1 - p0) * e); }, function () {
        i++;
        if (i >= pts.length - 1) { last.el.classList.add("is-done"); later(260, function () { fig.classList.add("is-end"); later(900, done); }); return; }
        var st = stops[i - 1].el;
        st.classList.add("is-on");
        var lamps = $$(".zr-lamp", st), dwell = lamps.length ? 520 : 240;
        lamps.forEach(function (l, j) { later(120 + j * 190, function () { l.classList.add("is-lit"); }); });
        later(dwell, function () { st.classList.remove("is-on"); leg(); });
      });
    }
    later(350, leg);
  }
  function done() {
    // hand the drawing back in its own units, so a resize keeps it true
    settle();
    fig.classList.remove("is-armed", "is-going");
  }
  function later(ms, fn) { return setTimeout(fn, ms); }

  arm();
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.disconnect();
      go();
    });
  }, { rootMargin: "0px 0px -42% 0px", threshold: 0 });
  io.observe(fig.querySelector(".zi-plate"));
})();
