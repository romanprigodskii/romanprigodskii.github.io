(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  var charts = {};
  function redrawCharts() { if (charts.field) charts.field.redraw(); }

  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = mqReduce.matches;

  /* ---------- theme ---------- */
  var swap = document.getElementById("themeswap");
  function applyTheme(name) {
    root.dataset.theme = name;
    if (swap) swap.setAttribute("aria-pressed", name === "paper" ? "true" : "false");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", name === "paper" ? "#f4f0e6" : "#16291f");
    window.setTimeout(redrawCharts, 60);
  }
  applyTheme(root.dataset.theme === "paper" ? "paper" : "slate");
  if (swap) {
    swap.addEventListener("click", function () {
      var next = root.dataset.theme === "paper" ? "slate" : "paper";
      applyTheme(next);
      try { localStorage.setItem("rp-theme", next); } catch (e) {}
    });
  }

  /* ---------- entrance stagger ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".stagger"), function (n) {
    n.style.setProperty("--d", (parseInt(n.dataset.s || "1", 10) - 1) * 90 + 120);
  });

  /* ---------- scroll reveals ---------- */
  var revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        ro.unobserve(e.target);
        fillBars(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(revealables, function (n) { ro.observe(n); });
  } else {
    Array.prototype.forEach.call(revealables, function (n) { n.classList.add("is-in"); });
    fillBars(document);
  }

  function fillBars(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll("[data-w]"), function (n) {
      if (n.dataset.filled) return;
      n.dataset.filled = "1";
      window.requestAnimationFrame(function () { n.style.width = n.dataset.w; });
    });
  }

  /* ---------- top bar ---------- */
  var bar = document.getElementById("bar");
  var hero = document.getElementById("top");
  if (bar && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-shown", !entries[0].isIntersecting);
    }, { rootMargin: "-72% 0px 0px 0px" }).observe(hero);
  }

  /* the bar adopts the palette of whatever section is under it */
  var surfaced = Array.prototype.slice.call(document.querySelectorAll("section"));
  if (bar && surfaced.length) {
    var ticking = false;
    var syncSurface = function () {
      ticking = false;
      var y = window.scrollY + 42, current = null;
      for (var i = 0; i < surfaced.length; i++) {
        if (surfaced[i].offsetTop <= y) current = surfaced[i];
      }
      var s = current && current.dataset.surface;
      if (s) bar.dataset.surface = s; else delete bar.dataset.surface;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(syncSurface); }
    }, { passive: true });
    window.addEventListener("resize", syncSurface, { passive: true });
    syncSurface();
  }

  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".bar__nav a"));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    var seen = new Map();
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.set(e.target.id, e.intersectionRatio); });
      var best = null, bestR = 0;
      seen.forEach(function (r, id) { if (r > bestR) { bestR = r; best = id; } });
      navLinks.forEach(function (a) {
        a.classList.toggle("is-here", best != null && a.getAttribute("href") === "#" + best);
      });
    }, { threshold: [0, 0.15, 0.4, 0.75] });
    sections.forEach(function (s) { so.observe(s); });
  }

  /* ---------- work accordion ---------- */
  /* the markup ships every panel open so the no-JS page reads in full; close the
     ones that are not the default here, once we know JS is running */
  Array.prototype.forEach.call(document.querySelectorAll(".work"), function (card) {
    if (!card.classList.contains("is-open")) {
      card.querySelector(".work__btn").setAttribute("aria-expanded", "false");
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll(".work__btn"), function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".work");
      var open = card.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        fillBars(card);
        if (charts.bars) charts.bars();
      }
    });
  });

  /* ---------- charts ---------- */
  var C = window.RPCharts;
  if (C) {
    fetch("assets/data/audit.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("data " + r.status); return r.json(); })
      .then(function (d) {
        var canvas = document.getElementById("field");
        if (canvas) {
          charts.field = C.heroField(canvas, d.segments.rows, { reduced: reduced });
          charts.field.run();
          canvas.classList.add("is-in");
          var rt;
          window.addEventListener("resize", function () {
            window.clearTimeout(rt);
            rt = window.setTimeout(function () { charts.field.redraw(); }, 160);
          }, { passive: true });
        }

        var barsHost = document.getElementById("bars-vertex");
        if (barsHost) {
          charts.bars = function () { fillBars(barsHost); };
          C.compareBars(barsHost, d.vertex);
        }

        var ladderHost = document.getElementById("ladder");
        if (ladderHost) C.ladder(ladderHost, d.ladder);

        var floorHost = document.getElementById("floor");
        if (floorHost) C.floorChart(floorHost, d.floor);

        var scatterHost = document.getElementById("scatter");
        if (scatterHost) C.scatter(scatterHost, d.segments);

        Array.prototype.forEach.call(document.querySelectorAll(".chart"), function (n) {
          if (n.classList.contains("is-in")) fillBars(n);
        });
        if (reduced || !("IntersectionObserver" in window)) {
          Array.prototype.forEach.call(document.querySelectorAll(".chart"), function (n) {
            n.classList.add("is-drawn");
          });
          fillBars(document);
        } else {
          var co = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (!e.isIntersecting) return;
              e.target.classList.add("is-drawn");
              fillBars(e.target);
              co.unobserve(e.target);
            });
          }, { threshold: 0.12 });
          Array.prototype.forEach.call(document.querySelectorAll(".chart"), function (n) { co.observe(n); });
        }
      })
      .catch(function (err) {
        document.querySelectorAll(".chart").forEach(function (n) { n.hidden = true; });
        if (window.console) console.warn("charts unavailable:", err.message);
      });
  }

  /* ---------- deep links land open ---------- */
  function openFromHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var t = document.getElementById(id);
    var card = t && t.closest && t.closest(".work");
    if (!card || card.classList.contains("is-open")) return;
    card.querySelector(".work__btn").click();
    /* the row is still growing, so re-anchor once it has finished */
    var body = card.querySelector(".work__body");
    var anchor = function () { card.scrollIntoView(); };
    if (body) {
      body.addEventListener("transitionend", function once(e) {
        if (e.propertyName !== "grid-template-rows") return;
        body.removeEventListener("transitionend", once);
        anchor();
      });
      window.setTimeout(anchor, 750);
    } else {
      anchor();
    }
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
})();
