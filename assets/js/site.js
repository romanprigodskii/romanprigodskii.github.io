(function (w, d) {
  "use strict";
  var root = d.documentElement;
  root.classList.add("js");

  var charts = {};
  var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var base = d.body.dataset.base || "";

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function docTop(el) { return el.getBoundingClientRect().top + w.scrollY; }
  function onMeasure(fn) { if (w.rpOnMeasure) w.rpOnMeasure(fn); else { fn(); w.addEventListener("resize", fn, { passive: true }); w.addEventListener("load", fn); } }
  function onScroll(fn) {
    if (w.rpOnScroll) { w.rpOnScroll(fn); return; }
    var q = false;
    var run = function () { q = false; fn(w.scrollY, w.innerHeight); };
    w.addEventListener("scroll", function () { if (!q) { q = true; w.requestAnimationFrame(run); } }, { passive: true });
    w.addEventListener("resize", run, { passive: true });
    run();
  }

  /* ---------- bars fill, shared with the motion layer ---------- */
  w.rpFillBars = function (scope) {
    if (!scope || !scope.querySelectorAll) return;
    all("[data-w]", scope).forEach(function (n) {
      if (n.dataset.filled) return;
      n.dataset.filled = "1";
      w.requestAnimationFrame(function () { n.style.width = n.dataset.w; });
    });
  };

  /* ---------- theme ----------
     The switch is instant: every colour changes in the same frame, the
     canvas re-reads its colours in that frame too, and nothing is left
     half-way through a transition. Where the browser can, a short
     cross-fade covers the cut. */
  var swap = d.getElementById("themeswap");
  function setTheme(name) {
    root.classList.add("theme-cut");
    root.dataset.theme = name;
    if (swap) swap.setAttribute("aria-pressed", name === "paper" ? "true" : "false");
    var meta = d.querySelector('meta[name="theme-color"]');
    if (meta) {
      var c = getComputedStyle(root).getPropertyValue(name === "paper" ? "--p-theme-paper" : "--p-theme").trim();
      if (c) meta.setAttribute("content", c);
    }
    if (charts.field && charts.field.redraw) charts.field.redraw();
    w.requestAnimationFrame(function () {
      w.requestAnimationFrame(function () { root.classList.remove("theme-cut"); });
    });
  }
  setTheme(root.dataset.theme === "paper" ? "paper" : "slate");
  if (swap) {
    swap.addEventListener("click", function () {
      var next = root.dataset.theme === "paper" ? "slate" : "paper";
      if (d.startViewTransition && !reduced) d.startViewTransition(function () { setTheme(next); });
      else setTheme(next);
      try { localStorage.setItem("rp-theme", next); } catch (e) {}
    });
  }

  /* ---------- top bar ---------- */
  var bar = d.getElementById("bar");
  var hero = d.getElementById("top");
  if (bar && hero && "IntersectionObserver" in w) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-shown", !entries[0].isIntersecting);
    }, { rootMargin: "-72% 0px 0px 0px" }).observe(hero);
  }

  /* the bar adopts the palette of whatever section is under it, and the nav
     marks the section being read; both from offsets cached at layout time */
  var surfaced = all("main > section, main > article, main > div");
  var navLinks = all(".bar__nav a").map(function (a) {
    var href = a.getAttribute("href") || "";
    var id = a.dataset.for || (href.charAt(0) === "#" ? href.slice(1) : "");
    var t = id && d.getElementById(id);
    return t ? { a: a, t: t, top: 0, bottom: 0 } : null;
  }).filter(Boolean);
  if (bar && (surfaced.length || navLinks.length)) {
    var geo = [], lastSurf = null, lastHere = null;
    onMeasure(function () {
      geo = surfaced.filter(function (n) { return n.offsetParent !== null || n.classList.contains("hero"); })
        .map(function (n) { return { top: docTop(n), surface: n.dataset.surface || null }; });
      navLinks.forEach(function (l) { l.top = docTop(l.t); l.bottom = l.top + l.t.offsetHeight; });
      lastSurf = lastHere = null;
    });
    onScroll(function (y, vh) {
      var at = y + 42, s = null, i;
      for (i = 0; i < geo.length; i++) if (geo[i].top <= at) s = geo[i].surface;
      if (s !== lastSurf) { lastSurf = s; if (s) bar.dataset.surface = s; else delete bar.dataset.surface; }
      var mid = y + vh * 0.45, here = null;
      for (i = 0; i < navLinks.length; i++) if (navLinks[i].top <= mid && navLinks[i].bottom > mid) here = navLinks[i];
      if (here !== lastHere) {
        lastHere = here;
        navLinks.forEach(function (l) { l.a.classList.toggle("is-here", l === here); });
      }
    });
  }

  /* ---------- charts ---------- */
  var C = w.RPCharts;
  function degrade(msg) {
    /* hide what would have been drawn, keep every caption and note */
    all("#field, #fieldLabels, #bars-vertex, #ladder, #floor, #scatter").forEach(function (n) { n.hidden = true; });
    if (msg && w.console) w.console.warn("charts unavailable:", msg);
  }
  if (!C) {
    degrade("charts.js did not load");
    fetch(base + "assets/data/audit.json").catch(function () {});
    return;
  }

  fetch(base + "assets/data/audit.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("data " + r.status); return r.json(); })
    .then(function (data) {
      var canvas = d.getElementById("field");
      if (canvas) {
        /* WebGL first; the 2D field is the fallback, and it reads the same rows */
        var f3 = w.RPField3D ? w.RPField3D(canvas, data.segments.rows, {
          reduced: reduced, labels: d.getElementById("fieldLabels")
        }) : null;
        if (f3) {
          charts.field = f3;
          root.classList.add("has-webgl");
          w.rpSetFold = f3.setFold;
          w.rpFieldPointer = f3.pointer;
          w.rpFieldPause = f3.pause;
          /* the page may already be scrolled into the fold by the time the data lands */
          f3.setFold(w.rpHeroFold ? w.rpHeroFold() : 0);
          if (root.classList.contains("is-locked")) f3.pause(true);
        } else {
          /* a canvas that was ever asked for WebGL can never give a 2D context, so the
             fallback needs a fresh one */
          var fresh = canvas.cloneNode(false);
          canvas.parentNode.replaceChild(fresh, canvas);
          canvas = fresh;
          charts.field = C.heroField(canvas, data.segments.rows, { reduced: reduced });
          /* no WebGL, no fold: the motion layer unpins the hero */
          if (w.rpHeroMeasure) w.rpHeroMeasure();
        }
        charts.field.run();
        canvas.classList.add("is-in");
        w.rpFieldRead = charts.field.read;
        var rt;
        w.addEventListener("resize", function () {
          w.clearTimeout(rt);
          rt = w.setTimeout(function () { charts.field.redraw(); }, 160);
        }, { passive: true });
      }

      var barsHost = d.getElementById("bars-vertex");
      if (barsHost) C.compareBars(barsHost, data.vertex);

      var ladderHost = d.getElementById("ladder");
      if (ladderHost) C.ladder(ladderHost, data.ladder);
      /* the SVG charts are laid out for the width they are drawn at, so redraw
         them when that width changes enough to matter */
      var lastW = {};
      function relayout() {
        [["ladder", data.ladder, C.ladder], ["scatter", data.segments, C.scatter]].forEach(function (c) {
          var h = d.getElementById(c[0]);
          if (!h) return;
          var cw = h.clientWidth;
          if (lastW[c[0]] && Math.abs(lastW[c[0]] - cw) < 40) return;
          lastW[c[0]] = cw;
          c[2](h, c[1]);
          var fig = h.closest(".chart");
          if (fig && fig.classList.contains("is-drawn")) { fig.classList.remove("is-drawn"); void fig.offsetWidth; fig.classList.add("is-drawn"); }
        });
      }
      var rl;
      w.addEventListener("resize", function () { w.clearTimeout(rl); rl = w.setTimeout(relayout, 200); }, { passive: true });

      var floorHost = d.getElementById("floor");
      if (floorHost) C.floorChart(floorHost, data.floor);

      var scatterHost = d.getElementById("scatter");
      if (scatterHost) C.scatter(scatterHost, data.segments);

      if (w.rpMeasure) w.rpMeasure();
      if (scatterHost) relayout();
      /* the research page only has its final height once the charts are in */
      if (w.rpRestore) w.setTimeout(w.rpRestore, 30);

      var figs = all(".chart");
      if (reduced || !("IntersectionObserver" in w)) {
        figs.forEach(function (n) { n.classList.add("is-drawn"); w.rpFillBars(n); });
      } else {
        var co = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-drawn");
            w.rpFillBars(e.target);
            co.unobserve(e.target);
          });
        }, { threshold: 0.12 });
        figs.forEach(function (n) { co.observe(n); });
      }
    })
    .catch(function (err) { degrade(err.message); });
})(window, document);
