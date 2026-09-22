/* Motion layer.
   Everything here is additive: with JavaScript off, or with reduced motion on,
   the page is a plain, complete document and none of this runs.

   One frame loop drives all of it. Nothing measures the page while it
   scrolls: offsets are cached whenever the layout changes, and a frame only
   does arithmetic and writes. Reading the layout in the same frame as writing
   it is what used to cost the scroll its smoothness. */
(function (w, d) {
  "use strict";

  var root = d.documentElement;
  var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = w.matchMedia("(pointer: fine)").matches;
  w.rpMotion = 1;

  var glOK = (function () {
    try { var c = d.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); }
    catch (e) { return false; }
  })();
  function roomy() { return w.innerWidth >= 900 && w.innerWidth > w.innerHeight && !reduced; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function docTop(el) { return el.getBoundingClientRect().top + w.scrollY; }

  /* our own scroll restoration: the pinned sections change the page height after
     load, so the browser's guess lands thousands of pixels off */
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  w.addEventListener("pagehide", function () {
    try { sessionStorage.setItem("rp-y:" + location.pathname, String(Math.round(w.scrollY))); } catch (e) {}
  });

  /* keyboard or pointer: focus that arrives by mouse must never move the page */
  var keyboard = false;
  d.addEventListener("keydown", function (e) { if (e.key === "Tab") keyboard = true; }, true);
  d.addEventListener("pointerdown", function () { keyboard = false; }, true);
  w.rpKeyboard = function () { return keyboard; };

  /* ---------------------------------------------------------------
     The frame loop, and the cache it reads from
     --------------------------------------------------------------- */
  var measures = [], reads = [], writes = [], frames = [];
  var Y = w.scrollY, VH = w.innerHeight, VW = w.innerWidth;
  var vel = 0, moved = true, needMeasure = true, lastT = 0;

  function measure() {
    VH = w.innerHeight; VW = w.innerWidth;
    for (var i = 0; i < measures.length; i++) measures[i]();
    moved = true;
  }
  function remeasure() { needMeasure = true; }
  w.rpMeasure = remeasure;
  /* fn() runs on the next frame and after every layout change; cache offsets
     there. Registering is cheap: the first frame measures everything at once */
  w.rpOnMeasure = function (fn) { measures.push(fn); needMeasure = true; };
  /* fn(y, vh) runs on every frame the page moved: reads first, then writes */
  w.rpOnScrollRead = function (fn) { reads.push(fn); moved = true; };
  w.rpOnScroll = function (fn) { writes.push(fn); moved = true; };
  /* fn(t, dt) runs every frame; dt is in 60 Hz frames, so speeds match on 120 Hz */
  w.rpOnFrame = function (fn) { frames.push(fn); };
  w.rpVelocity = function () { return vel; };

  var lenis = null;
  function frame(t) {
    var dt = lastT ? clamp((t - lastT) / 16.667, 0.25, 4) : 1;
    lastT = t;
    if (lenis) lenis.raf(t);
    if (needMeasure) { needMeasure = false; measure(); }
    var ny = w.scrollY, dy = ny - Y, i;
    if (dy !== 0) moved = true;
    vel += (dy / dt - vel) * 0.2;
    if (Math.abs(vel) < 0.01) vel = 0;
    Y = ny;
    if (moved) {
      moved = false;
      for (i = 0; i < reads.length; i++) reads[i](Y, VH);
      for (i = 0; i < writes.length; i++) writes[i](Y, VH);
    }
    for (i = 0; i < frames.length; i++) frames[i](t, dt);
    w.requestAnimationFrame(frame);
  }

  var rt = 0;
  w.addEventListener("resize", function () {
    w.clearTimeout(rt);
    rt = w.setTimeout(remeasure, 80);
  }, { passive: true });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(remeasure);
  w.addEventListener("load", remeasure);
  /* charts, images and late fonts change the page height; the cache follows */
  if ("ResizeObserver" in w) {
    var main = d.getElementById("main");
    if (main) new ResizeObserver(remeasure).observe(main);
  }

  /* ---------------------------------------------------------------
     Smooth scroll. Lenis keeps real scroll position, so sticky,
     IntersectionObserver and anchor links all behave normally.
     --------------------------------------------------------------- */
  var strip = { on: false, top: 0, end: 0 };
  function overLayer(ev) {
    var t = ev && ev.target;
    return root.classList.contains("case-open") || root.classList.contains("menu-open") ||
      !!(t && t.closest && t.closest("[data-lenis-prevent]"));
  }
  /* a sideways swipe over the pinned strip moves the strip. Left to the
     browser, the same swipe reads as "back" and leaves the page */
  function sideways(data) {
    var ev = data.event;
    if (!strip.on || !ev || ev.ctrlKey || ev.type.indexOf("wheel") < 0 || overLayer(ev)) return true;
    if (Math.abs(data.deltaX) <= Math.abs(data.deltaY)) return true;
    if (Y < strip.top - 2 || Y > strip.end + 2) return true;
    ev.preventDefault();
    var from = lenis.targetScroll, to = clamp(from + data.deltaX, strip.top, strip.end);
    if (Math.abs(to - from) < 0.5) return false;
    data.deltaY = to - from;
    data.deltaX = 0;
    return true;
  }
  if (w.Lenis && !reduced && fine) {
    try {
      lenis = new w.Lenis({
        duration: 1.1, smoothWheel: true, syncTouch: false,
        prevent: function (node) { return !!(node.closest && node.closest("[data-lenis-prevent]")); },
        virtualScroll: sideways
      });
      root.classList.add("rp-smooth");
    } catch (e) { lenis = null; }
  }
  w.rpLenis = lenis;
  w.requestAnimationFrame(frame);

  /* land on the fragment once the layout has its final height */
  var holding = false, userMoved = false;
  function goToHash() {
    var h = location.hash.slice(1);
    if (!h || h.indexOf("case-") === 0) return false;
    var t = d.getElementById(decodeURIComponent(h));
    if (!t) return false;
    /* compute the absolute target ourselves: Lenis's own element maths uses its
       animated position, which lags while the browser is still scrolling natively */
    function jump() {
      var y = Math.max(0, t.getBoundingClientRect().top + w.scrollY - 80);
      if (lenis) { if (lenis.resize) lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); }
      else w.scrollTo({ top: y, behavior: "instant" });
    }
    jump();
    /* charts, fonts and images keep arriving after load and push the target down;
       hold the fragment in place until the layout settles or the reader moves */
    if (!holding) {
      holding = true;
      var until = performance.now() + 2500;
      (function hold() {
        if (userMoved || performance.now() > until) { holding = false; return; }
        if (Math.abs(t.getBoundingClientRect().top - 80) > 2) jump();
        w.requestAnimationFrame(hold);
      })();
    }
    return true;
  }
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (ev) {
    w.addEventListener(ev, function () { userMoved = true; }, { passive: true, once: true });
  });
  function restore() {
    if (userMoved) return;
    if (goToHash()) return;
    var y = null;
    try { y = sessionStorage.getItem("rp-y:" + location.pathname); } catch (e) {}
    if (y != null && +y > 0) {
      if (lenis) { if (lenis.resize) lenis.resize(); lenis.scrollTo(+y, { immediate: true, force: true }); }
      else w.scrollTo(0, +y);
    }
  }
  w.rpGoToHash = goToHash;
  w.rpRestore = restore;

  /* keyboard scrolling keeps working while Lenis is gliding */
  if (lenis) {
    d.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t.closest && t.closest("[data-lenis-prevent], [role=dialog]")))) return;
      if (root.classList.contains("is-locked")) return;
      var page = w.innerHeight - 128, line = 80, to = null;
      var base = lenis.isScrolling ? lenis.targetScroll : w.scrollY;
      switch (e.key) {
        case "PageDown": to = base + page; break;
        case "PageUp": to = base - page; break;
        case " ": if (t && /^(BUTTON|A)$/.test(t.tagName)) return; to = base + (e.shiftKey ? -page : page); break;
        case "ArrowDown": to = base + line; break;
        case "ArrowUp": to = base - line; break;
        case "Home": to = 0; break;
        case "End": to = lenis.limit; break;
        default: return;
      }
      e.preventDefault();
      lenis.scrollTo(clamp(to, 0, lenis.limit), { duration: 0.7 });
    });
  }
  w.rpScrollTo = function (target) {
    if (lenis) lenis.scrollTo(target, { offset: -64 });
    else if (target && target.scrollIntoView) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
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
    /* one readable copy for assistive technology, the animated words hidden from it */
    if (!el.closest("[aria-hidden='true']") && !el.hasAttribute("aria-label")) {
      var copy = d.createElement("span");
      copy.className = "u-sr";
      copy.textContent = el.textContent.replace(/\s+/g, " ").trim();
      all(".w", el).forEach(function (wd) { wd.setAttribute("aria-hidden", "true"); });
      el.insertBefore(copy, el.firstChild);
    }
  }
  all("[data-split]").forEach(split);

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
     Reveals. The entrance waits for the typeface, briefly, so the name
     does not rise in a fallback face and then jump when Archivo lands.
     --------------------------------------------------------------- */
  var revealables = all("[data-split], .reveal, .rise");
  function startReveals() {
    if (!("IntersectionObserver" in w) || reduced) {
      revealables.forEach(function (n) { n.classList.add("is-in"); });
      countUp(d);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
        if (w.rpFillBars) w.rpFillBars(e.target);
        countUp(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    revealables.forEach(function (n) { io.observe(n); });
  }
  (function gate() {
    var done = false;
    function go() { if (done) return; done = true; startReveals(); }
    w.setTimeout(go, 900);
    try {
      if (d.fonts && d.fonts.load) d.fonts.load("780 1em Archivo").then(go, go);
      else go();
    } catch (e) { go(); }
  })();

  /* ---------------------------------------------------------------
     The hero holds while the field folds into its chart
     --------------------------------------------------------------- */
  (function heroPin() {
    var hero = d.querySelector(".hero");
    if (!hero || !hero.querySelector(".hero__pin")) return;
    var inner = hero.querySelector(".hero__inner");
    var base = hero.querySelector(".hero__base");
    var flat = hero.querySelector(".hero__flat");
    var on = false, top = 0, span = 0, last = -1;
    w.rpHeroFold = function () { return last < 0 ? 0 : last; };
    function measureHero() {
      on = roomy() && glOK && !root.classList.contains("no-webgl");
      hero.classList.toggle("is-pinned", on);
      top = docTop(hero);
      span = hero.offsetHeight - VH;
      last = -1;
    }
    function paint(y) {
      var f = 0;
      if (on && span > 0) f = clamp((clamp((y - top) / span, 0, 1) - 0.1) / 0.55, 0, 1);
      f = Math.round(f * 1000) / 1000;
      if (f === last) return;
      last = f;
      /* at rest the entrance animations own these properties; only the fold writes them */
      if (inner) {
        inner.style.opacity = f > 0 ? String(clamp(1 - f * 1.7, 0, 1)) : "";
        inner.style.transform = f > 0 ? "translate3d(0," + (-f * 9).toFixed(2) + "vh,0)" : "";
      }
      if (base) base.style.opacity = f > 0 ? String(clamp(1 - f * 2.6, 0, 1)) : "";
      if (flat) {
        var k = clamp((f - 0.72) * 4, 0, 1);
        flat.style.opacity = String(k);
        flat.style.transform = "translate3d(0," + ((1 - k) * 20).toFixed(1) + "px,0)";
      }
      if (w.rpSetFold) w.rpSetFold(f);
    }
    w.rpOnMeasure(measureHero);
    w.rpOnScroll(paint);
    w.rpHeroMeasure = function () { root.classList.add("no-webgl"); remeasure(); };
    hero.addEventListener("focusin", function (e) {
      if (!on || !keyboard || !e.target.closest(".hero__inner, .hero__base")) return;
      if (last > 0.05) {
        if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
        else w.scrollTo(0, top);
      }
    });
  })();

  /* ---------------------------------------------------------------
     The work filmstrip. Vertical scroll drives horizontal travel, a
     sideways swipe does the same, and the panels lean into the speed.
     --------------------------------------------------------------- */
  (function film() {
    var sec = d.querySelector(".film");
    var track = d.getElementById("filmTrack");
    var idxOut = d.getElementById("filmIdx");
    if (!sec || !track) return;
    var panels = all(".panel", track);
    var pin = sec.querySelector(".film__pin");
    var on = false, dist = 0, top = 0, geo = [], skew = 0, lastTx = null, stale = true;

    /* focus moving into an off-screen panel makes the browser scroll the pin
       sideways; the pin must never scroll, the vertical position drives it */
    if (pin) pin.addEventListener("scroll", function () { if (pin.scrollLeft) pin.scrollLeft = 0; }, { passive: true });

    function measureFilm() {
      on = roomy();
      sec.classList.toggle("is-pinned", on);
      strip.on = on;
      if (!on) {
        sec.style.height = "";
        track.style.transform = "";
        panels.forEach(function (p) { p.style.transform = ""; });
        geo = [];
        return;
      }
      var last = panels[panels.length - 1];
      var padR = parseFloat(getComputedStyle(track).paddingRight) || 0;
      dist = Math.max(0, last.offsetLeft + last.offsetWidth + padR - VW);
      sec.style.height = VH + dist + "px";
      top = docTop(sec);
      strip.top = top;
      strip.end = top + dist;
      geo = panels.map(function (p) { return { l: p.offsetLeft, w: p.offsetWidth, tf: null }; });
      lastTx = null;
      stale = true;
    }

    function paint(y) {
      if (!on) return;
      var p = dist > 0 ? clamp((y - top) / dist, 0, 1) : 0;
      var tx = -Math.round(p * dist * 10) / 10;
      if (tx !== lastTx) { track.style.transform = "translate3d(" + tx + "px,0,0)"; lastTx = tx; stale = true; }
      if (!stale) return;
      stale = false;
      var best = 0, bestVis = -1;
      for (var i = 0; i < geo.length; i++) {
        var g = geo[i], left = g.l + tx, right = left + g.w;
        var vis = Math.min(VW, right) - Math.max(0, left);
        if (vis > bestVis) { bestVis = vis; best = i; }
        if (right < -VW * 0.25 || left > VW * 1.25) continue;
        /* a coverflow: panels turn away from the viewer as they leave the centre */
        var cc = clamp((left + g.w / 2 - VW / 2) / (VW * 0.7), -1.2, 1.2);
        var tf = "perspective(1400px) rotateY(" + (cc * -20).toFixed(2) + "deg) scale(" +
          (1 - Math.abs(cc) * 0.07).toFixed(4) + ")" + (skew ? " skewX(" + skew.toFixed(2) + "deg)" : "");
        if (g.tf !== tf) { panels[i].style.transform = tf; g.tf = tf; }
      }
      if (p >= 0.999) best = panels.length - 1;
      if (idxOut) {
        var s = String(best + 1).padStart(2, "0");
        if (idxOut.textContent !== s) idxOut.textContent = s;
      }
    }

    w.rpOnMeasure(measureFilm);
    w.rpOnScroll(paint);
    if (!reduced) w.rpOnFrame(function () {
      if (!on) return;
      var target = clamp(vel * -0.12, -5, 5);
      var next = skew + (target - skew) * 0.12;
      if (Math.abs(target) < 0.01 && Math.abs(next) < 0.02) next = 0;
      if (Math.abs(next - skew) < 0.005 && next !== 0) return;
      if (next !== skew) { skew = next; stale = true; paint(Y); }
    });
    all("img", track).forEach(function (im) { if (!im.complete) im.addEventListener("load", remeasure, { once: true }); });

    /* tabbing to a panel scrolls the page to where that panel is on screen;
       a click never does, so a panel stays under the pointer that chose it */
    track.addEventListener("focusin", function (e) {
      if (!on || !keyboard || w.rpFocusRestoring) return;
      var pn = e.target.closest(".panel");
      if (!pn) return;
      if (pin) pin.scrollLeft = 0;
      var want = clamp((pn.offsetLeft + pn.offsetWidth / 2 - VW / 2) / Math.max(1, dist), 0, 1);
      var y = top + want * dist;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else w.scrollTo(0, y);
    });

    /* touch: a sideways drag over the pinned strip moves it too */
    if (pin) {
      var x0 = 0, y0 = 0, lastX = 0, mode = null;
      pin.addEventListener("touchstart", function (e) {
        if (!on || e.touches.length !== 1) { mode = "v"; return; }
        x0 = lastX = e.touches[0].clientX; y0 = e.touches[0].clientY; mode = null;
      }, { passive: true });
      pin.addEventListener("touchmove", function (e) {
        if (!on || mode === "v" || e.touches.length !== 1) return;
        var t = e.touches[0], dx = t.clientX - x0, dy = t.clientY - y0;
        if (!mode) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          mode = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
          if (mode === "v") return;
        }
        if (e.cancelable) e.preventDefault();
        var step = (lastX - t.clientX) * 1.4;
        lastX = t.clientX;
        w.scrollTo(0, clamp(w.scrollY + step, strip.top, strip.end));
      }, { passive: false });
    }
  })();

  /* ---------------------------------------------------------------
     The record. Each row reads in as it rises past the bottom of the
     screen and reads out the same way as it leaves under the header,
     so scrolling back undoes it. The frame only writes --p; the CSS
     turns it into the rule, the rank, the line and the evidence
     --------------------------------------------------------------- */
  (function ledger() {
    var box = d.querySelector(".ledger");
    if (!box || reduced) return;
    var items = all(".ledger__h, .ledger__row", box).map(function (el) {
      return { el: el, top: 0, h: 0, p: -1, nums: all("[data-count]", el) };
    });
    if (!items.length) return;
    var from = 0, to = 0, on = false, was = true;
    w.rpOnMeasure(function () {
      items.forEach(function (it) { it.top = docTop(it.el); it.h = it.el.offsetHeight; });
      var last = items[items.length - 1];
      from = items[0].top;
      to = last.top + last.h;
    });
    w.rpOnScroll(function (y, vh) {
      /* one last pass on the way out, so a fast fling never leaves a row half read */
      var near = y + vh > from - 40 && y < to + 40;
      if (!near && !was && on) return;
      was = near;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], t = it.top - y, p = 0;
        if (near) {
          var rise = clamp((vh * 0.98 - t) / (vh * 0.24), 0, 1);
          var fall = clamp((t + it.h - vh * 0.04) / (vh * 0.16), 0, 1);
          p = Math.round(Math.min(rise, fall) * 1000) / 1000;
        }
        if (p === it.p) continue;
        /* the rank counts up again every time its row comes back */
        if (it.p <= 0 && p > 0) it.nums.forEach(function (n) { delete n.dataset.counted; countUp(n); });
        it.p = p;
        it.el.style.setProperty("--p", p);
      }
      if (!on) { on = true; box.classList.add("is-scrub"); }
    });
  })();

  /* ---------------------------------------------------------------
     Scroll progress
     --------------------------------------------------------------- */
  (function progress() {
    var bar = d.getElementById("prog");
    if (!bar) return;
    var h = 1, last = -1;
    w.rpOnMeasure(function () { h = Math.max(1, root.scrollHeight - VH); });
    w.rpOnScroll(function (y) {
      var p = Math.round(clamp(y / h, 0, 1) * 1000) / 1000;
      if (p === last) return;
      last = p;
      bar.style.transform = "scaleX(" + p + ")";
    });
  })();

  /* ---------------------------------------------------------------
     The reticle. A measuring cursor; over the hero field it reads out
     the hypothesis under it. It only animates while it is catching up
     with the pointer, and it never asks the page what is under it.
     --------------------------------------------------------------- */
  (function reticle() {
    var el = d.getElementById("reticle");
    var read = d.getElementById("reticleRead");
    if (!el || !fine || reduced) { if (el) el.remove(); if (read) read.remove(); return; }
    var tx = -100, ty = -100, cx = tx, cy = ty, seen = false, running = false, big = false;
    function place() {
      var tf = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      el.style.transform = tf;
      if (read) read.style.transform = tf;
    }
    function loop() {
      cx += (tx - cx) * 0.24;
      cy += (ty - cy) * 0.24;
      if (Math.abs(tx - cx) < 0.15 && Math.abs(ty - cy) < 0.15) { cx = tx; cy = ty; running = false; place(); return; }
      place();
      w.requestAnimationFrame(loop);
    }
    function kick() { if (!running) { running = true; w.requestAnimationFrame(loop); } }
    var readOn = false;
    function sense() {
      var v = w.rpFieldRead ? w.rpFieldRead(tx, ty) : null;
      if (v && read) {
        var s = v.x + "  /  " + v.y;
        if (read.textContent !== s) read.textContent = s;
        if (!readOn) { read.classList.add("is-on"); readOn = true; }
      } else if (readOn && read) { read.classList.remove("is-on"); readOn = false; }
    }
    d.addEventListener("pointermove", function (ev) {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      tx = ev.clientX; ty = ev.clientY;
      /* the native cursor stays until the reticle actually has somewhere to be */
      if (!seen) { seen = true; cx = tx; cy = ty; root.classList.add("has-reticle"); el.classList.add("is-on"); }
      if (w.rpFieldPointer) w.rpFieldPointer(tx, ty);
      sense();
      kick();
    }, { passive: true });
    d.addEventListener("pointerover", function (ev) {
      var b = !!(ev.target && ev.target.closest && ev.target.closest("a, button, .panel[data-case], .file"));
      if (b !== big) { big = b; el.classList.toggle("is-lg", b); }
    }, { passive: true });
    /* the field folds under a still pointer as the page scrolls */
    w.rpOnScrollRead(function () { if (seen && (readOn || w.rpHeroFold && w.rpHeroFold() < 1)) sense(); });
    root.addEventListener("mouseleave", function () {
      el.classList.remove("is-on");
      if (read) { read.classList.remove("is-on"); readOn = false; }
      root.classList.remove("has-reticle");
      seen = false;
    });
    d.addEventListener("mousedown", function () { el.classList.add("is-down"); });
    d.addEventListener("mouseup", function () { el.classList.remove("is-down"); });
    w.rpReticleReset = function () {
      el.classList.remove("is-on", "is-lg", "is-down");
      big = false;
      if (read) { read.classList.remove("is-on"); readOn = false; }
    };
  })();

  /* ---------------------------------------------------------------
     Magnetic controls
     --------------------------------------------------------------- */
  if (fine && !reduced) {
    all(".magnet").forEach(function (el) {
      el.addEventListener("pointermove", function (ev) {
        var r = el.getBoundingClientRect();
        var dx = clamp((ev.clientX - (r.left + r.width / 2)) * 0.2, -9, 9);
        var dy = clamp((ev.clientY - (r.top + r.height / 2)) * 0.28, -7, 7);
        el.style.transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------------
     Page transition between the pages of this site. The wipe opens a
     page only when this site closed the one before it; a visitor who
     arrives from anywhere else sees the page, not a curtain.
     --------------------------------------------------------------- */
  (function wipe() {
    var el = d.getElementById("wipe");
    if (!el || reduced) return;
    el.addEventListener("animationend", function () { root.classList.remove("wipe-in"); });
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
      try { sessionStorage.setItem("rp-wipe", "1"); } catch (e) {}
      root.classList.add("wipe-out");
      w.setTimeout(function () { location.href = a.href; }, 400);
    });
    w.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      root.classList.remove("wipe-out", "wipe-in");
      try { sessionStorage.removeItem("rp-wipe"); } catch (err) {}
      all(".magnet").forEach(function (m) { m.style.transform = ""; });
      if (w.rpReticleReset) w.rpReticleReset();
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
    if (!t) return;
    if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
    if (!lenis) { t.focus({ preventScroll: false }); return; }
    ev.preventDefault();
    lenis.scrollTo(t, { offset: -80 });
    history.replaceState(null, "", "#" + id);
    t.focus({ preventScroll: true });
  });

  /* the first time the page has its final height, honour the fragment or the
     saved position */
  w.addEventListener("load", function () {
    w.setTimeout(function () { measure(); restore(); }, 60);
  });
})(window, document);
