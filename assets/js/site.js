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
  var surfaced = all("main > section, main > article, main > div").filter(function (n) { return n.offsetParent !== null || n === d.querySelector(".hero"); });
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
          var heroEl = d.querySelector(".hero");
          if (heroEl) f3.setFold(parseFloat(heroEl.style.getPropertyValue("--fold")) || 0);
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
        /* the weakest-to-strongest sweep should be seen, not played under the intro */
        if (root.classList.contains("intro") && charts.field.restartReveal) {
          w.addEventListener("rp:intro-done", function () { charts.field.restartReveal(); }, { once: true });
        }
        canvas.classList.add("is-in");
        w.rpFieldRead = charts.field.read;
        var rt;
        w.addEventListener("resize", function () {
          w.clearTimeout(rt);
          rt = w.setTimeout(function () { charts.field.redraw(); }, 160);
        }, { passive: true });
      }

      /* the ribbon draws itself as the statement passes */
      var rib = d.getElementById("ribbon");
      if (rib && C.ribbon) {
        var stmt = rib.closest("section");
        var lead = stmt.querySelector(".stmt__lead");
        var fitRibbon = function () {
          if (w.innerWidth < 900 || w.innerWidth <= w.innerHeight) { rib.style.top = ""; rib.style.height = ""; return; }
          rib.style.top = lead.offsetTop + "px";
          rib.style.height = Math.max(260, lead.offsetHeight) + "px";
        };
        fitRibbon();
        var rb = C.ribbon(rib, data.segments.rows);
        var drawRibbon = function () {
          var r = lead.getBoundingClientRect(), vh = w.innerHeight;
          var p = (vh * 0.9 - r.top) / Math.max(1, r.height + vh * 0.5);
          rb.set(reduced ? 1 : p);
        };
        if (w.rpOnScroll) w.rpOnScroll(drawRibbon); else drawRibbon();
        var rbT;
        w.addEventListener("resize", function () {
          w.clearTimeout(rbT);
          rbT = w.setTimeout(function () { fitRibbon(); rb = C.ribbon(rib, data.segments.rows); drawRibbon(); }, 200);
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

      if (w.rpFilmMeasure) w.rpFilmMeasure();
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
    .catch(function (err) { degrade(err.message); });
})(window, document);
