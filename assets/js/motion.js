/* Motion layer.
   Everything here is additive: with JavaScript off, or with reduced motion on,
   the page is a plain, complete document and none of this runs. */
(function (w, d) {
  "use strict";

  var root = d.documentElement;
  var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = w.matchMedia("(pointer: fine)").matches;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------
     Smooth scroll. Lenis keeps real scroll position, so sticky,
     IntersectionObserver and anchor links all behave normally.
     --------------------------------------------------------------- */
  var lenis = null;
  if (w.Lenis && !reduced && fine) {
    try {
      lenis = new w.Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false, prevent: function (node) { return !!(node.closest && node.closest("[data-lenis-prevent]")); } });
      var raf = function (t) { lenis.raf(t); w.requestAnimationFrame(raf); };
      w.requestAnimationFrame(raf);
      root.classList.add("has-lenis");
    } catch (e) { lenis = null; }
  }
  w.rpLenis = lenis;
  w.rpScrollTo = function (target) {
    if (lenis) lenis.scrollTo(target, { offset: -64 });
    else if (target && target.scrollIntoView) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  /* one shared velocity reading, used by the ticker and the filmstrip */
  var vel = 0, lastY = w.scrollY, dir = 1;
  (function track() {
    var y = w.scrollY;
    var dy = y - lastY;
    lastY = y;
    if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
    vel += (dy - vel) * 0.2;
    w.requestAnimationFrame(track);
  })();

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
     Odometers
     --------------------------------------------------------------- */
  function fmt(v, dec, sep) {
    var s = v.toFixed(dec);
    if (!sep) return s;
    var p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function countUp(scope) {
    var nodes = scope && scope.querySelectorAll ? all("[data-count]", scope) : [];
    if (scope && scope.dataset && scope.dataset.count) nodes.push(scope);
    nodes.forEach(function (n) {
      if (n.dataset.counted) return;
      n.dataset.counted = "1";
      var to = parseFloat(n.dataset.count);
      var dec = parseInt(n.dataset.dec || "0", 10);
      var pre = n.dataset.prefix || "", suf = n.dataset.suffix || "";
      var sep = n.hasAttribute("data-sep");
      if (reduced || !isFinite(to)) { n.textContent = pre + fmt(to, dec, sep) + suf; return; }
      var t0 = null, dur = 1300;
      var step = function (t) {
        if (t0 == null) t0 = t;
        var p = clamp((t - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 4);
        n.textContent = pre + fmt(to * e, dec, sep) + suf;
        if (p < 1) w.requestAnimationFrame(step);
      };
      w.requestAnimationFrame(step);
    });
  }
  w.rpCountUp = countUp;

  /* ---------------------------------------------------------------
     Reveals, held until the intro is out of the way
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
  if (!root.classList.contains("intro")) startReveals();

  /* ---------------------------------------------------------------
     Intro. A two-digit odometer rolls to 84 while the fonts and the
     data actually load. Once per session, skippable.
     --------------------------------------------------------------- */
  (function intro() {
    var el = d.getElementById("intro");
    if (!el) return;
    if (!root.classList.contains("intro")) { el.remove(); return; }
    try { sessionStorage.setItem("rp-seen", "1"); } catch (e) {}
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      root.classList.add("intro-out");
      startReveals();
      w.setTimeout(function () { root.classList.remove("intro", "intro-out"); el.remove(); }, 900);
    }
    if (reduced) { root.classList.remove("intro"); el.remove(); startReveals(); return; }

    var cols = all(".odo__col", el);
    cols.forEach(function (c) {
      for (var k = 0; k <= 9; k++) { var s = d.createElement("span"); s.textContent = k; c.appendChild(s); }
    });
    var bar = d.getElementById("introBar");
    function show(v) {
      var n = Math.round(v);
      var tens = Math.floor(n / 10), ones = n % 10;
      if (cols[0]) cols[0].style.transform = "translateY(" + -tens * 10 + "%)";
      if (cols[1]) cols[1].style.transform = "translateY(" + -ones * 10 + "%)";
    }

    /* real progress: fonts and the chart data, with a floor of time so it reads */
    var loaded = 0, want = 2;
    function got() { loaded++; }
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(got, got); else got();
    fetch("assets/data/audit.json").then(got, got);

    var t0 = null, shown = 0;
    (function tick(t) {
      if (t0 == null) t0 = t;
      var timeP = clamp((t - t0) / 1150, 0, 1);
      var target = Math.min(timeP, 0.25 + 0.75 * (loaded / want));
      shown += (target - shown) * 0.16;
      show(84 * shown);
      if (bar) bar.style.transform = "scaleX(" + shown.toFixed(3) + ")";
      if (shown > 0.995 && timeP >= 1) { show(84); w.setTimeout(finish, 260); return; }
      w.requestAnimationFrame(tick);
    })(performance.now());

    d.addEventListener("keydown", finish, { once: true });
    el.addEventListener("click", finish, { once: true });
    w.setTimeout(finish, 4000);
  })();

  /* ---------------------------------------------------------------
     The hero holds while the field folds into its chart
     --------------------------------------------------------------- */
  (function heroPin() {
    var hero = d.querySelector(".hero");
    if (!hero || !hero.querySelector(".hero__pin")) return;
    var on = false;
    function measure() {
      on = w.innerWidth >= 900 && !reduced;
      hero.classList.toggle("is-pinned", on);
      update();
    }
    function update() {
      if (!on) { hero.style.setProperty("--fold", "0"); if (w.rpSetFold) w.rpSetFold(0); return; }
      var r = hero.getBoundingClientRect();
      var span = hero.offsetHeight - w.innerHeight;
      var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      var fold = clamp((p - 0.1) / 0.55, 0, 1);
      hero.style.setProperty("--fold", fold.toFixed(4));
      hero.style.setProperty("--p", p.toFixed(4));
      if (w.rpSetFold) w.rpSetFold(fold);
    }
    var q = false;
    w.addEventListener("scroll", function () { if (!q) { q = true; w.requestAnimationFrame(function () { q = false; update(); }); } }, { passive: true });
    w.addEventListener("resize", measure, { passive: true });
    measure();
  })();

  /* ---------------------------------------------------------------
     Tickers follow the scroll: direction flips with it, speed rises
     with it
     --------------------------------------------------------------- */
  all(".ticker").forEach(function (tk) {
    var track = tk.querySelector(".ticker__track");
    if (!track) return;
    var base = track.innerHTML;
    var guard = 0;
    while (track.scrollWidth < w.innerWidth * 1.5 && guard++ < 8) track.innerHTML += base;
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    tk.appendChild(clone);
    if (reduced) return;
    tk.classList.add("is-driven");
    var x = 0, width = track.offsetWidth, visible = true;
    if ("IntersectionObserver" in w) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(tk);
    w.addEventListener("resize", function () { width = track.offsetWidth; }, { passive: true });
    (function loop() {
      if (visible && width) {
        var speed = 0.55 + Math.min(Math.abs(vel) * 0.18, 9);
        x -= speed * dir;
        if (x <= -width) x += width;
        if (x > 0) x -= width;
        var tf = "translate3d(" + x.toFixed(2) + "px,0,0)";
        track.style.transform = tf;
        clone.style.transform = tf;
      }
      w.requestAnimationFrame(loop);
    })();
  });

  /* ---------------------------------------------------------------
     The work filmstrip. Vertical scroll drives horizontal travel, and
     the panels lean into the speed of it.
     --------------------------------------------------------------- */
  (function film() {
    var sec = d.querySelector(".film");
    var track = d.getElementById("filmTrack");
    var idxOut = d.getElementById("filmIdx");
    if (!sec || !track) return;
    var panels = all(".panel", track);
    var on = false, dist = 0, skew = 0;

    function measure() {
      on = w.innerWidth >= 900 && !reduced;
      sec.classList.toggle("is-pinned", on);
      if (!on) { sec.style.height = ""; track.style.transform = ""; return; }
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
        var n = Math.min(panels.length, Math.floor(p * panels.length) + 1);
        var s = String(n).padStart(2, "0");
        if (idxOut.textContent !== s) idxOut.textContent = s;
      }
      /* each screenshot drifts inside its frame, opposite to the travel */
      var vw = w.innerWidth;
      panels.forEach(function (pn) {
        var img = pn.querySelector(".panel__shot img, .panel__shot svg");
        if (!img) return;
        var r = pn.getBoundingClientRect();
        var c = (r.left + r.width / 2 - vw / 2) / vw;
        img.style.transform = "translate3d(" + (c * -2.2).toFixed(2) + "%,0,0) scale(1.05)";
      });
    }
    (function lean() {
      if (on) {
        var target = clamp(vel * -0.12, -5, 5);
        skew += (target - skew) * 0.12;
        if (Math.abs(skew) > 0.01) track.style.setProperty("--skew", skew.toFixed(3) + "deg");
      }
      w.requestAnimationFrame(lean);
    })();
    var q = false;
    w.addEventListener("scroll", function () { if (!q) { q = true; w.requestAnimationFrame(function () { q = false; update(); }); } }, { passive: true });
    w.addEventListener("resize", measure, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);
    all("img", track).forEach(function (im) { if (!im.complete) im.addEventListener("load", measure, { once: true }); });
    measure();
    w.rpFilmMeasure = measure;
  })();

  /* ---------------------------------------------------------------
     Sections that rise over the one before them
     --------------------------------------------------------------- */
  (function riseSections() {
    var secs = all(".risesec");
    if (!secs.length || reduced) return;
    var q = false;
    function run() {
      q = false;
      var vh = w.innerHeight;
      secs.forEach(function (s) {
        var r = s.getBoundingClientRect();
        var k = clamp(r.top / vh, 0, 1);
        s.style.setProperty("--rise", k.toFixed(4));
      });
    }
    w.addEventListener("scroll", function () { if (!q) { q = true; w.requestAnimationFrame(run); } }, { passive: true });
    run();
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
    var prev = 0, q = false;
    function run() {
      q = false;
      var r = el.getBoundingClientRect();
      var start = w.innerHeight * 0.82, end = w.innerHeight * 0.34;
      var p = clamp((start - r.top) / Math.max(1, r.height + (start - end)), 0, 1);
      var k = Math.round(p * words.length);
      if (k === prev) return;
      if (k > prev) for (var i = prev; i < k; i++) words[i].classList.add("is-lit");
      else for (var j = prev - 1; j >= k; j--) words[j].classList.remove("is-lit");
      prev = k;
    }
    w.addEventListener("scroll", function () { if (!q) { q = true; w.requestAnimationFrame(run); } }, { passive: true });
    run();
  })();

  /* ---------------------------------------------------------------
     Scroll progress
     --------------------------------------------------------------- */
  (function progress() {
    var bar = d.getElementById("prog");
    if (!bar) return;
    var q = false;
    function run() {
      q = false;
      var h = d.documentElement.scrollHeight - w.innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? clamp(w.scrollY / h, 0, 1) : 0) + ")";
    }
    w.addEventListener("scroll", function () { if (!q) { q = true; w.requestAnimationFrame(run); } }, { passive: true });
    w.addEventListener("resize", run, { passive: true });
    run();
  })();

  /* ---------------------------------------------------------------
     The reticle. A measuring cursor; over the hero field it reads out
     the hypothesis under it.
     --------------------------------------------------------------- */
  (function reticle() {
    var el = d.getElementById("reticle");
    var read = d.getElementById("reticleRead");
    if (!el || !fine || reduced) { if (el) el.remove(); return; }
    root.classList.add("has-reticle");
    var tx = -100, ty = -100, cx = tx, cy = ty;
    (function loop() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      el.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      w.requestAnimationFrame(loop);
    })();
    d.addEventListener("pointermove", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      tx = ev.clientX; ty = ev.clientY;
      el.classList.add("is-on");
      var t = ev.target;
      el.classList.toggle("is-lg", !!(t.closest && t.closest("a, button, .panel, .file")));
      if (w.rpFieldPointer) w.rpFieldPointer(ev.clientX, ev.clientY);
      var v = w.rpFieldRead ? w.rpFieldRead(ev.clientX, ev.clientY) : null;
      if (v) {
        read.textContent = v.x + "  /  " + v.y;
        el.classList.add("is-read");
      } else el.classList.remove("is-read");
    }, { passive: true });
    d.documentElement.addEventListener("mouseleave", function () { el.classList.remove("is-on"); });
    d.addEventListener("mousedown", function () { el.classList.add("is-down"); });
    d.addEventListener("mouseup", function () { el.classList.remove("is-down"); });
  })();

  /* ---------------------------------------------------------------
     Magnetic controls
     --------------------------------------------------------------- */
  if (fine && !reduced) {
    all(".magnet").forEach(function (el) {
      var r = null;
      el.addEventListener("pointerenter", function () { r = el.getBoundingClientRect(); });
      el.addEventListener("pointermove", function (ev) {
        if (!r) r = el.getBoundingClientRect();
        var dx = ev.clientX - (r.left + r.width / 2);
        var dy = ev.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + (dx * 0.2).toFixed(2) + "px," + (dy * 0.28).toFixed(2) + "px)";
      });
      el.addEventListener("pointerleave", function () { r = null; el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------------
     Page transition between the pages of this site
     --------------------------------------------------------------- */
  (function wipe() {
    var el = d.getElementById("wipe");
    if (!el || reduced) return;
    d.addEventListener("click", function (ev) {
      if (ev.defaultPrevented) return;
      var a = ev.target.closest && ev.target.closest("a");
      if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^(mailto|tel):/.test(href)) return;
      var url;
      try { url = new URL(a.href); } catch (e) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      if (/\.pdf($|\?)/i.test(url.pathname)) return;
      ev.preventDefault();
      root.classList.add("wipe-out");
      w.setTimeout(function () { location.href = a.href; }, 400);
    });
    w.addEventListener("pageshow", function (e) {
      if (e.persisted) root.classList.remove("wipe-out");
    });
  })();

  /* anchor links go through Lenis so they land smoothly */
  d.addEventListener("click", function (ev) {
    if (ev.defaultPrevented) return;
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id || id.indexOf("case-") === 0) return;
    var t = d.getElementById(id);
    if (!t || !lenis) return;
    ev.preventDefault();
    lenis.scrollTo(t, { offset: -64 });
    history.replaceState(null, "", "#" + id);
  });
})(window, document);
