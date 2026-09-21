/* Interface layer: the menu, the project cases, rolling labels, the name
   that breathes under the pointer, the copy-to-clipboard address, the Now
   block and the section indicator. Each piece checks for its own markup and
   does nothing when it is absent, so every page can load this file. */
(function (w, d) {
  "use strict";

  var root = d.documentElement;
  var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = w.matchMedia("(pointer: fine)").matches;
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function lenis() { return w.rpLenis || null; }
  /* while a dialog is open, everything behind it is inert: no focus, no reading */
  var behind = ["bar", "main", "scrollnav"].map(function (id) { return d.getElementById(id); })
    .concat(all("body > footer, body > .skip"));
  function lockScroll(on) {
    var l = lenis();
    if (l) { if (on) l.stop(); else l.start(); }
    if (w.rpFieldPause) w.rpFieldPause(on);
    root.classList.toggle("is-locked", on);
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
        if (then) then(); else if (lastFocus && lastFocus.focus) lastFocus.focus();
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
    var current = null, lastFocus = null, pushed = false, closeT = null, swapT = null;
    scroller.setAttribute("tabindex", "-1");
    root.classList.add("has-cases");

    function mount(id) {
      var art = d.getElementById(id);
      if (!art) return false;
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
      if (!root.classList.contains("case-open") || layer.hidden) {
        lastFocus = opts.from || lastFocus || d.activeElement;
        layer.hidden = false;
        w.requestAnimationFrame(function () { root.classList.add("case-open"); });
        lockScroll(true);
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
      if (!root.classList.contains("case-open")) return;
      root.classList.remove("case-open");
      w.clearTimeout(swapT);
      layer.classList.remove("is-swapping");
      lockScroll(false);
      w.clearTimeout(closeT);
      closeT = w.setTimeout(function () {
        if (root.classList.contains("case-open")) return;
        layer.hidden = true;
        if (current) { var art = d.getElementById(current); if (art) store.appendChild(art); }
        current = null;
        if (lastFocus && lastFocus.focus && !(w.rpMenuOpen && w.rpMenuOpen())) lastFocus.focus({ preventScroll: true });
        lastFocus = null;
      }, reduced ? 0 : 620);
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
      layer.classList.add("is-swapping");
      w.clearTimeout(swapT);
      swapT = w.setTimeout(function () {
        if (!root.classList.contains("case-open")) return;
        open(id);
        layer.classList.remove("is-swapping");
      }, reduced ? 0 : 280);
    });
    layer.setAttribute("tabindex", "-1");
    d.addEventListener("keydown", function (e) {
      if (!root.classList.contains("case-open")) return;
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
     typeface's own width axis
     --------------------------------------------------------------- */
  (function breathe() {
    var hosts = all("[data-letters]");
    var hero = d.querySelector(".hero");
    if (!hosts.length || !hero || reduced || !fine) return;
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
          letters.push({ el: s, w: 0, g: 0 });
        });
      });
    });
    var px = -9999, py = -9999, active = false, raf = null;
    function frame() {
      raf = null;
      var still = true;
      var rects = letters.map(function (l) { return l.el.getBoundingClientRect(); });
      letters.forEach(function (l, i) {
        var r = rects[i];
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dist = Math.hypot(px - cx, (py - cy) * 1.4);
        var k = active ? Math.pow(clamp(1 - dist / 260, 0, 1), 2) : 0;
        var tw = k * 9, tg = k * 100;
        l.w += (tw - l.w) * 0.16;
        l.g += (tg - l.g) * 0.16;
        if (Math.abs(tw - l.w) > 0.05 || Math.abs(tg - l.g) > 0.5) still = false;
        l.el.style.fontVariationSettings = '"wdth" ' + (116 + l.w).toFixed(2) + ', "wght" ' + (780 + l.g).toFixed(0);
      });
      if (!still) raf = w.requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = w.requestAnimationFrame(frame); }
    hero.addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; active = true; kick(); });
    hero.addEventListener("pointerleave", function () { active = false; kick(); });
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
     Clocks and the Now block
     --------------------------------------------------------------- */
  (function now() {
    var clocks = all("[data-clock]");
    var waits = all("[data-now-wait]");
    var fmtS = null, fmtM = null;
    try {
      fmtS = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Moscow", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      fmtM = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Moscow", hour12: false, hour: "2-digit", minute: "2-digit" });
    } catch (e) {}
    /* two decision dates, each at the end of the day anywhere on earth:
       TAE on 22 September, E-Values and NewInML on 29 September */
    var TAE = Date.UTC(2026, 8, 23, 11, 59, 0);
    var REST = Date.UTC(2026, 8, 30, 11, 59, 0);
    function inWords(ms) {
      var days = Math.floor(ms / 864e5), hrs = Math.floor((ms % 864e5) / 36e5);
      return (days > 0 ? days + (days === 1 ? " day " : " days ") : "") + hrs + (hrs === 1 ? " hour" : " hours");
    }
    function tick() {
      var n = new Date();
      clocks.forEach(function (c) {
        if (!fmtS) return;
        c.textContent = (c.closest(".hero__clock") ? fmtS : fmtM).format(n);
      });
      var t = n.getTime(), msg;
      if (t < TAE) msg = "the TAE decision, in " + inWords(TAE - t) + ", then E-Values and NewInML on 29 September";
      else if (t < REST) msg = "E-Values and NewInML decisions, in " + inWords(REST - t);
      else msg = "NeurIPS 2026 workshop decisions, which are now out";
      waits.forEach(function (wv) { if (wv.textContent !== msg) wv.textContent = msg; });
    }
    if (!clocks.length && !waits.length) return;
    tick();
    w.setInterval(tick, 1000);
  })();

  /* ---------------------------------------------------------------
     Section indicator
     --------------------------------------------------------------- */
  (function scrollnav() {
    var nav = d.getElementById("scrollnav");
    var nEl = d.getElementById("snN"), nameEl = d.getElementById("snName"), bar = d.getElementById("snBar");
    var secs = all("[data-nav]");
    if (!nav || !secs.length) return;
    var last = -1, queued = false;
    function run() {
      queued = false;
      var mid = w.innerHeight * 0.45, idx = 0;
      for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top <= mid) idx = i;
      var r = secs[idx].getBoundingClientRect();
      var p = clamp((mid - r.top) / Math.max(1, r.height), 0, 1);
      bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
      if (idx !== last) {
        last = idx;
        nav.classList.add("is-swap");
        w.setTimeout(function () {
          nEl.textContent = String(idx + 1).padStart(2, "0");
          nameEl.textContent = secs[idx].dataset.nav;
          nav.classList.remove("is-swap");
        }, reduced ? 0 : 180);
      }
      var nr = nav.getBoundingClientRect(), under = null;
      var ny = nr.top + nr.height / 2;
      for (var k = 0; k < secs.length; k++) {
        var sr = secs[k].getBoundingClientRect();
        if (sr.top <= ny && sr.bottom >= ny) { under = secs[k]; break; }
      }
      var surf = under && under.dataset.surface;
      if (surf) nav.dataset.surface = surf; else delete nav.dataset.surface;
      nav.classList.toggle("is-on", idx > 0 && idx < secs.length - 1 && !root.classList.contains("case-open"));
    }
    w.addEventListener("scroll", function () { if (!queued) { queued = true; w.requestAnimationFrame(run); } }, { passive: true });
    w.addEventListener("resize", run, { passive: true });
    run();
  })();

  /* ---------------------------------------------------------------
     The method cards settle back as the next one covers them
     --------------------------------------------------------------- */
  (function stack() {
    var cards = all("#stack .card");
    if (cards.length < 2 || reduced) return;
    var queued = false;
    function run() {
      queued = false;
      for (var i = 0; i < cards.length - 1; i++) {
        var a = cards[i].getBoundingClientRect(), b = cards[i + 1].getBoundingClientRect();
        var cover = clamp((a.bottom - b.top) / Math.max(1, a.height), 0, 1);
        cards[i].style.transform = "scale(" + (1 - cover * 0.05).toFixed(4) + ")";
        cards[i].style.filter = cover > 0.01 ? "brightness(" + (1 - cover * 0.28).toFixed(3) + ")" : "";
      }
    }
    w.addEventListener("scroll", function () { if (!queued) { queued = true; w.requestAnimationFrame(run); } }, { passive: true });
    run();
  })();
})(window, document);
