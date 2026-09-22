/* Interface layer: the menu, the project cases, rolling labels, the name
   that breathes under the pointer, the copy-to-clipboard address, the
   decision countdowns and the section indicator. Each piece checks for its
   own markup and does nothing when it is absent, so every page can load this
   file. */
(function (w, d) {
  "use strict";

  var root = d.documentElement;
  var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = w.matchMedia("(pointer: fine)").matches;
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function docTop(el) { return el.getBoundingClientRect().top + w.scrollY; }

  /* the motion layer's cached frame loop, or plain scroll events without it */
  function onMeasure(fn) { if (w.rpOnMeasure) w.rpOnMeasure(fn); else { fn(); w.addEventListener("resize", fn, { passive: true }); w.addEventListener("load", fn); } }
  function onScroll(fn) {
    if (w.rpOnScroll) { w.rpOnScroll(fn); return; }
    var q = false;
    var run = function () { q = false; fn(w.scrollY, w.innerHeight); };
    w.addEventListener("scroll", function () { if (!q) { q = true; w.requestAnimationFrame(run); } }, { passive: true });
    w.addEventListener("resize", run, { passive: true });
    run();
  }

  function lenis() { return w.rpLenis || null; }
  /* while a dialog is open, everything behind it is inert: no focus, no reading.
     Marking a whole page inert restyles all of it, so it waits until the layer
     has finished arriving, and it lifts the moment the layer starts to leave */
  var behind = ["bar", "main", "scrollnav"].map(function (id) { return d.getElementById(id); })
    .concat(all("body > footer, body > .skip"));
  var inertT = 0;
  function lockScroll(on) {
    var l = lenis();
    if (l) { if (on) l.stop(); else l.start(); }
    if (w.rpFieldPause) w.rpFieldPause(on);
    root.classList.toggle("is-locked", on);
    w.clearTimeout(inertT);
    if (on) inertT = w.setTimeout(function () { setInert(true); }, reduced ? 0 : 700);
    else setInert(false);
  }
  function setInert(on) {
    behind.forEach(function (el) {
      if (!el) return;
      if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    });
  }

  /* ---------------------------------------------------------------
     Rolling labels: the text slides up and an identical copy slides in
     --------------------------------------------------------------- */
  all(".roll").forEach(function (el) {
    if (el.dataset.rolled) return;
    el.dataset.rolled = "1";
    var txt = el.textContent.trim();
    el.textContent = "";
    var box = d.createElement("span"); box.className = "roll__box";
    var a = d.createElement("span"); a.className = "roll__a"; a.textContent = txt;
    var b = d.createElement("span"); b.className = "roll__b"; b.textContent = txt; b.setAttribute("aria-hidden", "true");
    box.appendChild(a); box.appendChild(b);
    el.appendChild(box);
  });

  /* ---------------------------------------------------------------
     Focus trap shared by the menu and the case layer
     --------------------------------------------------------------- */
  function trap(container, ev) {
    if (ev.key !== "Tab") return;
    var f = all('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (n) { return n.offsetParent !== null || n === d.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && d.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && d.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
  /* giving focus back must not scroll anything, including the filmstrip */
  function restoreFocus(el) {
    if (!el || !el.focus) return;
    w.rpFocusRestoring = true;
    try { el.focus({ preventScroll: true }); } finally { w.rpFocusRestoring = false; }
  }

  /* ---------------------------------------------------------------
     Menu
     --------------------------------------------------------------- */
  (function menu() {
    var btn = d.getElementById("menuBtn");
    var panel = d.getElementById("menu");
    var close = d.getElementById("menuClose");
    if (!btn || !panel) return;
    var lastFocus = null, open = false, hideT = null;

    function show() {
      if (open) return;
      if (root.classList.contains("case-open")) return;
      open = true;
      w.clearTimeout(hideT);
      lastFocus = d.activeElement;
      panel.hidden = false;
      w.requestAnimationFrame(function () { root.classList.add("menu-open"); });
      btn.setAttribute("aria-expanded", "true");
      lockScroll(true);
      w.setTimeout(function () { var f = panel.querySelector(".menu__link"); if (f) f.focus(); }, 60);
    }
    function hide(then) {
      if (!open) { if (then) then(); return; }
      open = false;
      root.classList.remove("menu-open");
      btn.setAttribute("aria-expanded", "false");
      lockScroll(false);
      w.clearTimeout(hideT);
      hideT = w.setTimeout(function () {
        if (open) return;
        panel.hidden = true;
        if (then) then(); else restoreFocus(lastFocus);
      }, reduced ? 0 : 520);
    }
    btn.addEventListener("click", function () { open ? hide() : show(); });
    if (close) close.addEventListener("click", function () { hide(); });
    /* on the document, so Esc and Tab still work after a click on plain text
       inside the menu has sent focus to the body */
    d.addEventListener("keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); hide(); return; }
      if (e.key === "Tab" && !panel.contains(d.activeElement)) {
        e.preventDefault();
        var f = panel.querySelector(".menu__link"); if (f) f.focus();
        return;
      }
      trap(panel, e);
    });
    panel.setAttribute("tabindex", "-1");
    all("a", panel).forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href") || "";
        if (href.charAt(0) !== "#") { hide(function () {}); return; }
        e.preventDefault();
        hide(function () {
          var t = d.getElementById(href.slice(1));
          if (t && w.rpScrollTo) w.rpScrollTo(t);
          if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
        });
      });
    });
    w.rpMenuHide = hide;
    w.rpMenuOpen = function () { return open; };
  })();

  /* ---------------------------------------------------------------
     Project cases
     --------------------------------------------------------------- */
  (function cases() {
    var layer = d.getElementById("caselayer");
    var slot = d.getElementById("caseSlot");
    var scroller = d.getElementById("caseScroll");
    var closeBtn = d.getElementById("caseClose");
    var nextBtn = d.getElementById("caseNext");
    var store = d.getElementById("cases");
    if (!layer || !slot || !store) return;

    var order = all(".case", store).map(function (n) { return n.id; });
    var current = null, lastFocus = null, pushed = false, closeT = null, swapT = null, isOpen = false;
    scroller.setAttribute("tabindex", "-1");
    root.classList.add("has-cases");

    /* a case's pictures start loading as soon as its panel is pointed at, so
       they are decoded by the time the layer arrives */
    function warm(id) {
      var art = d.getElementById(id);
      if (!art || art.dataset.warm) return;
      art.dataset.warm = "1";
      all("img", art).forEach(function (im) {
        im.loading = "eager";
        if (im.decode) im.decode().catch(function () {});
      });
    }
    d.addEventListener("pointerover", function (e) {
      var p = e.target.closest && e.target.closest(".panel[data-case]");
      if (p) warm(p.dataset.case);
    }, { passive: true });
    d.addEventListener("focusin", function (e) {
      var p = e.target.closest && e.target.closest(".panel[data-case]");
      if (p) warm(p.dataset.case);
    });
    /* and the rest once the page is idle */
    (w.requestIdleCallback || function (f) { return w.setTimeout(f, 2500); })(function () {
      order.forEach(warm);
    }, { timeout: 4000 });

    function mount(id) {
      var art = d.getElementById(id);
      if (!art) return false;
      warm(id);
      if (current && current !== id) {
        var prev = d.getElementById(current);
        if (prev) store.appendChild(prev);
      }
      slot.appendChild(art);
      current = id;
      scroller.scrollTop = 0;
      var name = art.querySelector(".case__title");
      layer.setAttribute("aria-label", name ? name.textContent : "Project");
      /* numbers roll, charts draw, on every open */
      all("[data-count]", art).forEach(function (n) { delete n.dataset.counted; });
      if (w.rpCountUp) w.rpCountUp(art);
      all(".chart", art).forEach(function (c) { c.classList.add("is-drawn"); if (w.rpFillBars) w.rpFillBars(c); });
      var i = order.indexOf(id);
      var nxt = d.getElementById(order[(i + 1) % order.length]);
      if (nextBtn && nxt) {
        var t = nxt.querySelector(".case__title");
        var lab = nextBtn.querySelector(".roll__a"), lab2 = nextBtn.querySelector(".roll__b");
        var text = "Next: " + (t ? t.textContent : "project");
        if (lab) { lab.textContent = text; lab2.textContent = text; } else nextBtn.textContent = text;
      }
      return true;
    }

    function open(id, opts) {
      opts = opts || {};
      if (!d.getElementById(id)) return;
      if (w.rpMenuHide) w.rpMenuHide(function () {});
      if (!mount(id)) return;
      w.clearTimeout(closeT);
      if (!isOpen) {
        isOpen = true;
        lastFocus = opts.from || lastFocus || d.activeElement;
        layer.hidden = false;
        lockScroll(true);
        /* one frame to lay the case out off screen, then the slide starts from
           a finished layout instead of stalling on its first frame */
        w.requestAnimationFrame(function () {
          w.requestAnimationFrame(function () { if (isOpen) root.classList.add("case-open"); });
        });
      }
      /* only now is the scroller laid out, so only now does resetting it stick */
      scroller.scrollTop = 0;
      if (!opts.fromHistory) {
        var url = location.pathname + location.search + "#" + id;
        if (pushed) history.replaceState({ rpCase: id }, "", url);
        else { history.pushState({ rpCase: id }, "", url); pushed = true; }
      }
      /* focus the title inside the scroller, so the keyboard scrolls the case */
      w.setTimeout(function () {
        var art = d.getElementById(id);
        var h = art && art.querySelector(".case__title");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
        else scroller.focus({ preventScroll: true });
      }, 80);
    }

    function close(opts) {
      opts = opts || {};
      if (!isOpen) return;
      isOpen = false;
      root.classList.remove("case-open");
      w.clearTimeout(swapT);
      layer.classList.remove("is-swapping");
      lockScroll(false);
      w.clearTimeout(closeT);
      closeT = w.setTimeout(function () {
        if (isOpen) return;
        layer.hidden = true;
        if (current) { var art = d.getElementById(current); if (art) store.appendChild(art); }
        current = null;
        if (!(w.rpMenuOpen && w.rpMenuOpen())) restoreFocus(lastFocus);
        lastFocus = null;
      }, reduced ? 0 : 640);
      if (!opts.fromHistory && pushed) { pushed = false; history.back(); }
      else if (!opts.fromHistory) history.replaceState(null, "", location.pathname + location.search + "#work");
    }

    /* open from any panel, or any link to a case */
    d.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#case-"]');
      var panel = e.target.closest && e.target.closest(".panel[data-case]");
      if (a) { e.preventDefault(); open(a.getAttribute("href").slice(1), { from: a }); return; }
      if (panel && !e.target.closest("a:not(.panel__open), button")) {
        e.preventDefault();
        open(panel.dataset.case, { from: panel.querySelector(".panel__open") });
      }
    });
    if (closeBtn) closeBtn.addEventListener("click", function () { close(); });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      var i = order.indexOf(current);
      var id = order[(i + 1) % order.length];
      warm(id);
      layer.classList.add("is-swapping");
      w.clearTimeout(swapT);
      swapT = w.setTimeout(function () {
        if (!isOpen) return;
        open(id);
        layer.classList.remove("is-swapping");
      }, reduced ? 0 : 280);
    });
    layer.setAttribute("tabindex", "-1");
    d.addEventListener("keydown", function (e) {
      if (!isOpen) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab" && !layer.contains(d.activeElement)) { e.preventDefault(); closeBtn && closeBtn.focus(); return; }
      trap(layer, e);
    });
    w.addEventListener("popstate", function (e) {
      var id = (e.state && e.state.rpCase) || location.hash.slice(1);
      if (id && id.indexOf("case-") === 0 && d.getElementById(id)) { pushed = false; open(id, { fromHistory: true }); }
      else { pushed = false; close({ fromHistory: true }); }
    });
    /* a deep link lands on the case itself */
    var h = location.hash.slice(1);
    if (h.indexOf("case-") === 0 && d.getElementById(h)) {
      var from = d.querySelector('.panel__open[href="#' + h + '"]');
      if (history.state && history.state.rpCase === h) {
        /* a reload of an open case: reuse its history entry instead of adding one */
        pushed = true;
        w.setTimeout(function () { open(h, { fromHistory: true, from: from }); }, 400);
      } else {
        history.replaceState(null, "", location.pathname + location.search + "#work");
        w.setTimeout(function () { open(h, { from: from }); }, 400);
      }
    }
    w.rpOpenCase = open;
  })();

  /* ---------------------------------------------------------------
     The name breathes: letters near the pointer widen along the
     typeface's own width axis. Each frame reads one box, the heading's,
     and places the letters from offsets cached at rest.
     --------------------------------------------------------------- */
  (function breathe() {
    var hosts = all("[data-letters]");
    var hero = d.querySelector(".hero");
    var h1 = d.querySelector(".hero__name");
    if (!hosts.length || !hero || !h1 || reduced || !fine) return;
    var letters = [];
    hosts.forEach(function (h) {
      all(".wi", h).forEach(function (wi) {
        var txt = wi.textContent;
        wi.textContent = "";
        Array.prototype.forEach.call(txt, function (ch) {
          var s = d.createElement("span");
          s.className = "ch";
          s.textContent = ch;
          wi.appendChild(s);
          letters.push({ el: s, x: 0, y: 0, w: 0, g: 0, v: "" });
        });
      });
    });
    var px = -9999, py = -9999, active = false, raf = null, placed = false;
    function place() {
      /* centres relative to the heading, taken while the letters are at rest */
      var hr = h1.getBoundingClientRect();
      letters.forEach(function (l) {
        var r = l.el.getBoundingClientRect();
        l.x = r.left + r.width / 2 - hr.left;
        l.y = r.top + r.height / 2 - hr.top;
      });
      placed = true;
    }
    function frame() {
      raf = null;
      if (!placed) place();
      var hr = h1.getBoundingClientRect();
      var still = true;
      for (var i = 0; i < letters.length; i++) {
        var l = letters[i];
        var dist = Math.hypot(px - (hr.left + l.x), (py - (hr.top + l.y)) * 1.4);
        var k = active ? Math.pow(clamp(1 - dist / 260, 0, 1), 2) : 0;
        var tw = k * 9, tg = k * 100;
        l.w += (tw - l.w) * 0.16;
        l.g += (tg - l.g) * 0.16;
        if (Math.abs(tw - l.w) > 0.05 || Math.abs(tg - l.g) > 0.5) still = false;
        var v = '"wdth" ' + (116 + l.w).toFixed(1) + ', "wght" ' + (780 + l.g).toFixed(0);
        if (v !== l.v) { l.el.style.fontVariationSettings = v; l.v = v; }
      }
      if (!still) raf = w.requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = w.requestAnimationFrame(frame); }
    hero.addEventListener("pointerenter", function () { if (!active) placed = false; });
    hero.addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; active = true; kick(); });
    hero.addEventListener("pointerleave", function () { active = false; kick(); });
    onMeasure(function () { placed = false; });
  })();

  /* ---------------------------------------------------------------
     Copy the address on click, and still let mailto do its thing
     --------------------------------------------------------------- */
  var toast = d.getElementById("toast");
  var toastT = null;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-on");
    w.clearTimeout(toastT);
    toastT = w.setTimeout(function () {
      toast.classList.remove("is-on");
      w.setTimeout(function () { if (!toast.classList.contains("is-on")) toast.textContent = ""; }, 400);
    }, 2200);
  }
  all("[data-copy]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.dataset.copy;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(function () { say("Address copied"); }, function () {});
      }
    });
  });

  /* ---------------------------------------------------------------
     Decision countdowns, beside the workshops they belong to. The
     deadline is the end of the decision day anywhere on earth.
     --------------------------------------------------------------- */
  (function countdowns() {
    var items = all("[data-countdown]").map(function (el) {
      var at = Date.parse(el.getAttribute("data-countdown"));
      var k = el.querySelector(".cd__k"), clock = el.querySelector(".cd__t");
      if (!isFinite(at) || !clock) return null;
      /* without script the line reads "Decision due 22 September"; with it,
         the date becomes a live count and returns once the day has passed */
      var it = { el: el, at: at, k: k, clock: clock, k0: k ? k.textContent : "", t0: clock.textContent, u: [] };
      if (at > Date.now()) {
        el.classList.add("is-live");
        if (k) k.textContent = el.getAttribute("data-live") || "Decision in";
        clock.setAttribute("aria-hidden", "true");
        clock.innerHTML = '<b data-u="d">00</b><i>d</i> <b data-u="h">00</b><i>h</i> <b data-u="m">00</b><i>m</i> <b data-u="s">00</b><i>s</i>';
        it.u = ["d", "h", "m", "s"].map(function (u) { return clock.querySelector('[data-u="' + u + '"]'); });
        /* one readable sentence for assistive technology, rather than a ticking one */
        var sr = d.createElement("span");
        sr.className = "u-sr";
        sr.textContent = it.t0 + ", end of day anywhere on earth";
        el.appendChild(sr);
        it.sr = sr;
      } else it.over = true;
      if (it.over) el.classList.add("is-over");
      return it;
    }).filter(Boolean);
    if (!items.length) return;
    function two(n) { return n < 10 ? "0" + n : String(n); }
    function tick() {
      var now = Date.now();
      items.forEach(function (it) {
        if (it.over) return;
        var ms = it.at - now;
        if (ms <= 0) {
          it.over = true;
          it.el.classList.remove("is-live");
          it.el.classList.add("is-over");
          if (it.k) it.k.textContent = it.k0;
          it.clock.removeAttribute("aria-hidden");
          it.clock.textContent = it.t0;
          if (it.sr) it.sr.remove();
          return;
        }
        var s = Math.floor(ms / 1000);
        var v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
        for (var i = 0; i < it.u.length; i++) {
          var t = two(v[i]);
          if (it.u[i] && it.u[i].textContent !== t) it.u[i].textContent = t;
        }
      });
    }
    tick();
    /* tick on the second, not a drifting second after the page opened */
    (function loop() {
      w.setTimeout(function () { if (!d.hidden) tick(); loop(); }, 1000 - (Date.now() % 1000) + 5);
    })();
    d.addEventListener("visibilitychange", function () { if (!d.hidden) tick(); });
  })();

  /* ---------------------------------------------------------------
     The header's rolling line
     --------------------------------------------------------------- */
  (function headRoll() {
    var lines = all(".bar__roll span");
    if (lines.length < 2 || reduced) return;
    var i = 0;
    w.setInterval(function () {
      if (d.hidden) return;
      var cur = lines[i], next = lines[(i + 1) % lines.length];
      cur.classList.remove("is-cur"); cur.classList.add("is-out");
      next.classList.remove("is-out"); next.classList.add("is-cur");
      w.setTimeout(function () { cur.classList.remove("is-out"); }, 760);
      i = (i + 1) % lines.length;
    }, 3400);
  })();

  /* ---------------------------------------------------------------
     Section indicator, from cached offsets
     --------------------------------------------------------------- */
  (function scrollnav() {
    var nav = d.getElementById("scrollnav");
    var nEl = d.getElementById("snN"), nameEl = d.getElementById("snName"), bar = d.getElementById("snBar");
    var secs = all("[data-nav]");
    if (!nav || !secs.length) return;
    var geo = [], navY = 0, last = -1, lastP = -1, lastSurf = null, lastOn = null, swapT = 0;
    onMeasure(function () {
      geo = secs.map(function (s) {
        var t = docTop(s);
        return { top: t, bottom: t + s.offsetHeight, surface: s.dataset.surface || null, strip: s.classList.contains("film") && s.classList.contains("is-pinned") };
      });
      navY = w.innerHeight / 2;
      last = -1; lastP = -1; lastSurf = null; lastOn = null;
    });
    onScroll(function (y, vh) {
      if (!geo.length) return;
      var mid = y + vh * 0.45, idx = 0, i;
      for (i = 0; i < geo.length; i++) if (geo[i].top <= mid) idx = i;
      var g = geo[idx];
      var p = Math.round(clamp((mid - g.top) / Math.max(1, g.bottom - g.top), 0, 1) * 500) / 500;
      if (p !== lastP) { lastP = p; bar.style.transform = "scaleY(" + p + ")"; }
      if (idx !== last) {
        last = idx;
        nav.classList.add("is-swap");
        w.clearTimeout(swapT);
        swapT = w.setTimeout(function () {
          nEl.textContent = String(idx + 1).padStart(2, "0");
          nameEl.textContent = secs[idx].dataset.nav;
          nav.classList.remove("is-swap");
        }, reduced ? 0 : 180);
      }
      var at = y + navY, surf = null;
      for (i = 0; i < geo.length; i++) if (geo[i].top <= at && geo[i].bottom >= at) { surf = geo[i].surface; break; }
      if (surf !== lastSurf) { lastSurf = surf; if (surf) nav.dataset.surface = surf; else delete nav.dataset.surface; }
      /* the pinned strip has its own counter, and its panels run through the gutter */
      var show = idx > 0 && idx < secs.length - 1 && !g.strip;
      if (show !== lastOn) { lastOn = show; nav.classList.toggle("is-on", show); }
    });
  })();

  /* ---------------------------------------------------------------
     Before the papers: the newspaper's edge, traced from the scan.
     It draws in as it rises into view and back out on the way down,
     and the fitted curve can be swapped for a triangle wave, which
     turns into it point by point
     --------------------------------------------------------------- */
  (function wave() {
    var fig = d.getElementById("wave");
    var src = d.getElementById("waveData");
    if (!fig || !src) return;
    var D;
    try { D = JSON.parse(src.textContent); } catch (e) { return; }
    var fit = fig.querySelector(".wave__fit"), miss = fig.querySelector(".wave__miss");
    var read = d.getElementById("waveRead");
    var btns = all("[data-fit]", fig);
    var WORDS = {
      s: "A sine misses the traced edge by 1.8% of its height.",
      t: "A triangle wave, given the same freedom, misses by 4.8%, most of it at the crests and troughs."
    };
    var cur = "s", curve = D.s.slice(), res = D.rs.slice(), raf = 0;

    function line(xs, ys, gap) {
      var out = "", prev = null;
      for (var i = 0; i < xs.length; i++) {
        out += (prev == null || (gap && xs[i] - prev > gap) ? "M" : "L") + xs[i] + " " + ys[i].toFixed(1) + " ";
        prev = xs[i];
      }
      return out;
    }
    function draw() {
      fit.setAttribute("d", line(D.x, curve));
      miss.setAttribute("d", line(D.rx, res, 12));
    }
    function pick(key) {
      if (key === cur) return;
      cur = key;
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.fit === key)); });
      fig.classList.toggle("is-tri", key === "t");
      if (read) read.textContent = WORDS[key];
      var c0 = curve.slice(), r0 = res.slice(), c1 = D[key], r1 = D["r" + key];
      w.cancelAnimationFrame(raf);
      if (reduced) { curve = c1.slice(); res = r1.slice(); draw(); return; }
      var t0 = null;
      raf = w.requestAnimationFrame(function step(t) {
        if (t0 == null) t0 = t;
        var p = clamp((t - t0) / 700, 0, 1), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p), i;
        for (i = 0; i < curve.length; i++) curve[i] = c0[i] + (c1[i] - c0[i]) * e;
        for (i = 0; i < res.length; i++) res[i] = r0[i] + (r1[i] - r0[i]) * e;
        draw();
        if (p < 1) raf = w.requestAnimationFrame(step);
      });
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { pick(b.dataset.fit); }); });

    if (reduced) return;
    var top = 0, last = -1, on = false;
    onMeasure(function () { top = docTop(fig); });
    onScroll(function (y, vh) {
      var p = Math.round(clamp((vh * 0.95 - (top - y)) / (vh * 0.5), 0, 1) * 1000) / 1000;
      if (p === last) return;
      last = p;
      fig.style.setProperty("--p", p);
      if (!on) { on = true; fig.classList.add("is-scrub"); }
    });
  })();

  /* ---------------------------------------------------------------
     The tea glass fills with discs. Their number steps up with the
     scroll as the figure rises into view, and back down on the way
     out, until the visitor takes the slider, which then keeps it
     --------------------------------------------------------------- */
  (function discs() {
    var fig = d.getElementById("discs");
    var range = d.getElementById("discsN");
    if (!fig || !range) return;
    var g = fig.querySelector(".discs__g");
    var out = d.getElementById("discsOut"), sum = d.getElementById("discsSum"), dot = d.getElementById("discsDot");
    var NS = "http://www.w3.org/2000/svg";
    var STEPS = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128];
    /* the paper's four parabolas, as [a, b, c, to]; the axis is y = 3.25 and the glass is 9.6 tall */
    var P = [[-0.087, 0.574, 0, 3.4], [-0.089, 0.681, -0.382, 6], [0.146, -2.301, 9.146, 7.5], [0.235, -3.48, 12.926, 9.6]];
    function radius(x) {
      for (var i = 0; i < P.length; i++) if (x <= P[i][3] + 1e-9) return 3.25 - (P[i][0] * x * x + P[i][1] * x + P[i][2]);
      return 0;
    }
    var shown = -1, touched = false;
    function set(k) {
      k = clamp(k, 0, STEPS.length - 1);
      if (k === shown) return;
      shown = k;
      var n = STEPS[k], h = 9.6 / n, v = 0, frag = d.createDocumentFragment();
      for (var i = 1; i <= n; i++) {
        var r = radius(i * h);
        v += Math.PI * r * r * h;
        var rc = d.createElementNS(NS, "rect");
        rc.setAttribute("x", (325 - r * 100).toFixed(1));
        rc.setAttribute("y", ((i - 1) * h * 100).toFixed(1));
        rc.setAttribute("width", (r * 200).toFixed(1));
        rc.setAttribute("height", (h * 100).toFixed(2));
        frag.appendChild(rc);
      }
      g.textContent = "";
      g.appendChild(frag);
      range.value = String(k);
      range.setAttribute("aria-valuetext", n + " discs, " + v.toFixed(1) + " cubic centimetres");
      out.textContent = n;
      sum.textContent = v.toFixed(1);
      /* the strip runs from 150 to 230 ml */
      dot.style.setProperty("--at", (clamp((v - 150) / 80, 0, 1) * 100).toFixed(1) + "%");
    }
    range.addEventListener("input", function () { touched = true; set(parseInt(range.value, 10)); });

    if (reduced) return;
    var top = 0;
    onMeasure(function () { top = docTop(fig); });
    onScroll(function (y, vh) {
      if (touched) return;
      var p = clamp((vh * 0.95 - (top - y)) / (vh * 0.6), 0, 1);
      set(Math.round(p * (STEPS.length - 1)));
    });
  })();

  /* ---------------------------------------------------------------
     Product loops play only while they are on screen. Under reduced
     motion they never start, and the poster frame is the picture
     --------------------------------------------------------------- */
  (function loops() {
    var vids = all("video.loop");
    if (!vids.length || reduced || !("IntersectionObserver" in w)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) v.pause();
      });
    }, { threshold: 0.35 });
    vids.forEach(function (v) { io.observe(v); });
  })();
})(window, document);
