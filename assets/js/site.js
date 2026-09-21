(function (w, d) {
  "use strict";
  var root = d.documentElement;
  root.classList.add("js");

  var charts = {};
  var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var base = d.body.dataset.base || "";

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }

  /* ---------- bars fill, shared with the motion layer ---------- */
  w.rpFillBars = function (scope) {
    if (!scope || !scope.querySelectorAll) return;
    all("[data-w]", scope).forEach(function (n) {
      if (n.dataset.filled) return;
      n.dataset.filled = "1";
      w.requestAnimationFrame(function () { n.style.width = n.dataset.w; });
    });
  };

  /* ---------- theme ---------- */
  var swap = d.getElementById("themeswap");
  function applyTheme(name) {
    root.dataset.theme = name;
    if (swap) swap.setAttribute("aria-pressed", name === "paper" ? "true" : "false");
    var meta = d.querySelector('meta[name="theme-color"]');
    if (meta) {
      var cs = getComputedStyle(root);
      var c = cs.getPropertyValue(name === "paper" ? "--p-theme-paper" : "--p-theme").trim();
      if (c) meta.setAttribute("content", c);
    }
    w.setTimeout(function () { if (charts.field) charts.field.redraw(); }, 60);
  }
  applyTheme(root.dataset.theme === "paper" ? "paper" : "slate");
  if (swap) {
    swap.addEventListener("click", function () {
      var next = root.dataset.theme === "paper" ? "slate" : "paper";
      applyTheme(next);
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

  /* the bar adopts the palette of whatever section is under it */
  var surfaced = all("section");
  if (bar && surfaced.length) {
    var ticking = false;
    var syncSurface = function () {
      ticking = false;
      var y = w.scrollY + 42, current = null;
      for (var i = 0; i < surfaced.length; i++) {
        if (surfaced[i].offsetTop <= y) current = surfaced[i];
      }
      var s = current && current.dataset.surface;
      if (s) bar.dataset.surface = s; else delete bar.dataset.surface;
    };
    w.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; w.requestAnimationFrame(syncSurface); }
    }, { passive: true });
    w.addEventListener("resize", syncSurface, { passive: true });
    syncSurface();
  }

  var navLinks = all(".bar__nav a").filter(function (a) {
    return (a.getAttribute("href") || "").charAt(0) === "#";
  });
  var sections = navLinks.map(function (a) { return d.querySelector(a.getAttribute("href")); }).filter(Boolean);
  if (sections.length && "IntersectionObserver" in w) {
    var seen = {};
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.intersectionRatio; });
      var best = null, bestR = 0;
      Object.keys(seen).forEach(function (id) { if (seen[id] > bestR) { bestR = seen[id]; best = id; } });
      navLinks.forEach(function (a) {
        a.classList.toggle("is-here", best != null && a.getAttribute("href") === "#" + best);
      });
    }, { threshold: [0, 0.15, 0.4, 0.75] });
    sections.forEach(function (s) { so.observe(s); });
  }

  /* ---------- charts ---------- */
  var C = w.RPCharts;
  if (!C) return;

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
        } else {
          charts.field = C.heroField(canvas, data.segments.rows, { reduced: reduced });
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

      var floorHost = d.getElementById("floor");
      if (floorHost) C.floorChart(floorHost, data.floor);

      var scatterHost = d.getElementById("scatter");
      if (scatterHost) C.scatter(scatterHost, data.segments);

      if (w.rpFilmMeasure) w.rpFilmMeasure();

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
        /* inside the pinned filmstrip a chart can sit off to the side for a long
           time, so draw those as soon as the strip itself is reached */
        var film = d.querySelector(".film");
        if (film) {
          new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            all(".chart", film).forEach(function (n) {
              n.classList.add("is-drawn");
              w.rpFillBars(n);
            });
          }, { threshold: 0.05 }).observe(film);
        }
      }
    })
    .catch(function (err) {
      all(".chart").forEach(function (n) { n.hidden = true; });
      if (w.console) w.console.warn("charts unavailable:", err.message);
    });
})(window, document);
