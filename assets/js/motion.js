/* Motion layer.
   Everything here is additive: with JavaScript off, or with reduced motion on,
   the page is a plain, complete document and none of this runs. */
(function (w, d) {
  "use strict";

  var root = d.documentElement;
  var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = w.matchMedia("(pointer: fine)").matches;
  var EASE = 0.12;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------
     Smooth scroll. Lenis keeps real scroll position, so sticky,
     IntersectionObserver and anchor links all behave normally.
     --------------------------------------------------------------- */
  var lenis = null;
  if (w.Lenis && !reduced && fine) {
    try {
      lenis = new w.Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
      var raf = function (t) { lenis.raf(t); w.requestAnimationFrame(raf); };
      w.requestAnimationFrame(raf);
      root.classList.add("has-lenis");
    } catch (e) { lenis = null; }
  }
  w.rpScrollTo = function (target) {
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------------------------------------------------------------
     Word splitting. Only text nodes are touched, so nested links and
     emphasis survive intact.
     --------------------------------------------------------------- */
  function split(el) {
    if (el.dataset.isSplit) return;
    el.dataset.isSplit = "1";
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
            var outer = d.createElement("span"); outer.className = "w";
            var inner = d.createElement("span"); inner.className = "wi";
            inner.textContent = part;
            inner.style.setProperty("--wi", i++);
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.className !== "w") {
          walk(n);
        }
      });
    })(el);
    el.style.setProperty("--words", i);
    if (el.dataset.d) el.style.setProperty("--d", el.dataset.d);
  }

  all("[data-split]").forEach(split);
  all("[data-lit]").forEach(split);

  /* ---------------------------------------------------------------
     Reveals
     --------------------------------------------------------------- */
  var revealables = all("[data-split], .reveal, .rise");
  var startReveals;
  if ("IntersectionObserver" in w && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
        if (w.rpFillBars) w.rpFillBars(e.target);
        countUp(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    startReveals = function () { revealables.forEach(function (n) { io.observe(n); }); };
  } else {
    startReveals = function () {
      revealables.forEach(function (n) { n.classList.add("is-in"); });
      countUp(d);
    };
  }
  /* held until the intro panel is out of the way, so the hero is not
     already finished animating behind it */
  if (!root.classList.contains("intro")) startReveals();
  else w.rpStartReveals = startReveals;

  /* ---------------------------------------------------------------
     Odometers
     --------------------------------------------------------------- */
  function countUp(scope) {
    var nodes = scope.querySelectorAll ? all("[data-count]", scope) : [];
    if (scope.dataset && scope.dataset.count) nodes.push(scope);
    nodes.forEach(function (n) {
      if (n.dataset.counted) return;
      n.dataset.counted = "1";
      var to = parseFloat(n.dataset.count);
      var dec = parseInt(n.dataset.dec || "0", 10);
      var pre = n.dataset.prefix || "";
      var suf = n.dataset.suffix || "";
      if (reduced || !isFinite(to)) { return; }
      var t0 = null, dur = 1100;
      var step = function (t) {
        if (t0 == null) t0 = t;
        var p = clamp((t - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 4);
        n.textContent = pre + (to * e).toFixed(dec) + suf;
        if (p < 1) w.requestAnimationFrame(step);
      };
      n.textContent = pre + (0).toFixed(dec) + suf;
      w.requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------
     Intro. Short, skippable, once per session.
     --------------------------------------------------------------- */
  (function intro() {
    var el = d.getElementById("intro");
    if (!el) return;
    if (!root.classList.contains("intro")) { el.remove(); return; }
    try { sessionStorage.setItem("rp-seen", "1"); } catch (e) {}

    var num = d.getElementById("introNum");
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      root.classList.add("intro-out");
      if (w.rpStartReveals) { w.rpStartReveals(); w.rpStartReveals = null; }
      w.setTimeout(function () {
        root.classList.remove("intro", "intro-out");
        el.remove();
      }, 820);
    }
    if (reduced) {
      root.classList.remove("intro");
      el.remove();
      if (w.rpStartReveals) { w.rpStartReveals(); w.rpStartReveals = null; }
      return;
    }

    var t0 = null, dur = 900;
    (function tick(t) {
      if (t0 == null) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      if (num) num.textContent = String(Math.round(84 * e)).padStart(3, "0");
      if (p < 1) w.requestAnimationFrame(tick);
      else w.setTimeout(finish, 240);
    })();

    d.addEventListener("keydown", finish, { once: true });
    el.addEventListener("click", finish, { once: true });
    w.setTimeout(finish, 3200);
  })();

  /* ---------------------------------------------------------------
     Ticker. Duplicated until it covers twice the viewport, so the
     loop has no seam at any width.
     --------------------------------------------------------------- */
  all(".ticker").forEach(function (tk) {
    var track = tk.querySelector(".ticker__track");
    if (!track) return;
    var base = track.innerHTML;
    var guard = 0;
    while (track.scrollWidth < w.innerWidth * 2 && guard++ < 8) track.innerHTML += base;
    track.style.setProperty("--len", track.scrollWidth / 2 + "px");
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.classList.add("ticker__track--clone");
    tk.appendChild(clone);
  });

  /* ---------------------------------------------------------------
     The work filmstrip. Vertical scroll drives horizontal travel,
     but only where there is room for it.
     --------------------------------------------------------------- */
  (function film() {
    var sec = d.querySelector(".film");
    var track = d.getElementById("filmTrack");
    var idxOut = d.getElementById("filmIdx");
    if (!sec || !track) return;

    var on = false, dist = 0;

    function measure() {
      on = w.innerWidth >= 900 && !reduced;
      sec.classList.toggle("is-pinned", on);
      if (!on) {
        sec.style.height = "";
        track.style.transform = "";
        return;
      }
      dist = Math.max(0, track.scrollWidth - w.innerWidth);
      sec.style.height = w.innerHeight + dist + "px";
      update();
    }

    function update() {
      if (!on) return;
      var rect = sec.getBoundingClientRect();
      var span = sec.offsetHeight - w.innerHeight;
      var p = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;
      track.style.transform = "translate3d(" + -(p * dist).toFixed(1) + "px,0,0)";
      if (idxOut) {
        var panels = track.children.length;
        var n = Math.min(panels, Math.floor(p * panels) + 1);
        var s = String(n).padStart(2, "0");
        if (idxOut.textContent !== s) idxOut.textContent = s;
      }
    }

    var queued = false;
    w.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      w.requestAnimationFrame(function () { queued = false; update(); });
    }, { passive: true });
    w.addEventListener("resize", measure, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);
    measure();
    w.rpFilmMeasure = measure;
  })();

  /* ---------------------------------------------------------------
     Scroll-lit statement
     --------------------------------------------------------------- */
  (function lit() {
    var el = d.querySelector("[data-lit]");
    if (!el) return;
    var words = all(".w", el);
    if (!words.length) return;
    if (reduced) { words.forEach(function (n) { n.classList.add("is-lit"); }); return; }
    var prev = -1, queued = false;
    function run() {
      var r = el.getBoundingClientRect();
      var start = w.innerHeight * 0.82, end = w.innerHeight * 0.34;
      var p = clamp((start - r.top) / Math.max(1, r.height + (start - end)), 0, 1);
      var k = Math.round(p * words.length);
      if (k === prev) return;
      if (k > prev) for (var i = Math.max(0, prev); i < k; i++) words[i].classList.add("is-lit");
      else for (var j = prev - 1; j >= k; j--) if (words[j]) words[j].classList.remove("is-lit");
      prev = k;
    }
    w.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      w.requestAnimationFrame(function () { queued = false; run(); });
    }, { passive: true });
    run();
  })();

  /* ---------------------------------------------------------------
     Scroll progress
     --------------------------------------------------------------- */
  (function progress() {
    var bar = d.getElementById("prog");
    if (!bar) return;
    var queued = false;
    function run() {
      var h = d.documentElement.scrollHeight - w.innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? clamp(w.scrollY / h, 0, 1) : 0) + ")";
    }
    w.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      w.requestAnimationFrame(function () { queued = false; run(); });
    }, { passive: true });
    w.addEventListener("resize", run, { passive: true });
    run();
  })();

  /* ---------------------------------------------------------------
     Moscow clock
     --------------------------------------------------------------- */
  (function clock() {
    var out = d.getElementById("clock");
    if (!out) return;
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Moscow", hour12: false,
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    } catch (e) { out.parentNode.style.display = "none"; return; }
    var tick = function () { out.textContent = fmt.format(new Date()); };
    tick();
    w.setInterval(tick, 1000);
  })();

  /* ---------------------------------------------------------------
     The reticle. A measuring cursor, which over the hero field reads
     out the coordinates of whatever is under it.
     --------------------------------------------------------------- */
  (function reticle() {
    var el = d.getElementById("reticle");
    var read = d.getElementById("reticleRead");
    if (!el || !fine || reduced) { if (el) el.remove(); return; }
    root.classList.add("has-reticle");

    var tx = w.innerWidth / 2, ty = w.innerHeight / 2, cx = tx, cy = ty, raf = null;
    function loop() {
      cx += (tx - cx) * EASE;
      cy += (ty - cy) * EASE;
      el.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      raf = w.requestAnimationFrame(loop);
    }
    loop();

    d.addEventListener("mousemove", function (ev) {
      tx = ev.clientX; ty = ev.clientY;
      el.classList.add("is-on");

      var t = ev.target;
      var hot = t.closest && t.closest("a, button, .work__btn, .file, .panel__facts li");
      el.classList.toggle("is-lg", !!hot);

      if (w.rpFieldRead) {
        var v = w.rpFieldRead(ev.clientX, ev.clientY);
        if (v) {
          read.textContent = "e " + v.x + "  /  " + v.y;
          el.classList.add("is-read");
        } else {
          el.classList.remove("is-read");
        }
      }
    }, { passive: true });

    d.addEventListener("mouseleave", function () { el.classList.remove("is-on"); });
    d.addEventListener("mousedown", function () { el.classList.add("is-down"); });
    d.addEventListener("mouseup", function () { el.classList.remove("is-down"); });
  })();

  /* ---------------------------------------------------------------
     Magnetic controls
     --------------------------------------------------------------- */
  if (fine && !reduced) {
    all(".magnet").forEach(function (el) {
      var r = null;
      el.addEventListener("mouseenter", function () { r = el.getBoundingClientRect(); });
      el.addEventListener("mousemove", function (ev) {
        if (!r) r = el.getBoundingClientRect();
        var dx = ev.clientX - (r.left + r.width / 2);
        var dy = ev.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + dx * 0.22 + "px," + dy * 0.3 + "px)";
      });
      el.addEventListener("mouseleave", function () { r = null; el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------------
     Page transition between the three pages of this site
     --------------------------------------------------------------- */
  (function wipe() {
    var el = d.getElementById("wipe");
    if (!el) return;
    w.requestAnimationFrame(function () { root.classList.add("wipe-in"); });
    if (reduced) return;
    d.addEventListener("click", function (ev) {
      var a = ev.target.closest && ev.target.closest("a");
      if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^(mailto|tel):/.test(href)) return;
      var url;
      try { url = new URL(a.href); } catch (e) { return; }
      if (url.origin !== location.origin) return;
      if (/\.pdf($|\?)/i.test(url.pathname)) return;
      ev.preventDefault();
      root.classList.add("wipe-out");
      w.setTimeout(function () { location.href = a.href; }, 380);
    });
    w.addEventListener("pageshow", function (e) {
      if (e.persisted) root.classList.remove("wipe-out");
    });
  })();

  /* anchor links go through Lenis so they land smoothly */
  d.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    var t = d.getElementById(id);
    if (!t || !lenis) return;
    ev.preventDefault();
    lenis.scrollTo(t, { offset: -64 });
    history.replaceState(null, "", "#" + id);
  });
})(window, document);
