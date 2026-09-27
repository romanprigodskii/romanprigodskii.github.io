/* Alfa-Romeo: the loupe, the rouble scale and the credit screen.
   Enhances markup that is complete without it: with JavaScript off the loupe
   shows the first screen and the sheet links each screen at full size, the
   scale is drawn whole, and the brackets stand beside the credit screen. */
(function () {
  "use strict";
  var RP = window.RP, F = window.Fig;
  if (!RP) return;
  var still = RP.still, tween = RP.tween, EO = RP.EO, EIO = RP.EIO;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function later(ms, fn) { return setTimeout(fn, ms); }
  /* run fn once el is in view; site.js may already have seen it */
  function onIn(el, fn) { if (el.classList.contains("in")) fn(); else RP.watch(el, fn); }

  /* ------------------------------------------------ 1. the loupe and the sheet */
  var lead = $("[data-ar-lead]");
  if (lead) (function () {
    var lp = $("[data-ar-lp]", lead), cap = $("[data-ar-cap]", lead), sheet = $("[data-ar-sheet]", lead);
    var thumbs = $$("[data-ar-t]", lead);
    if (!lp || !sheet || !thumbs.length) return;
    var sel = document.createElement("i");
    sel.className = "ar-sel";
    sel.setAttribute("aria-hidden", "true");
    sheet.appendChild(sel);
    var cur = 0, warmed = {};

    function place(anim) {
      var img = $("img", thumbs[cur]);
      var pad = window.innerWidth <= 760 ? 4 : 7;
      var w = img.offsetWidth, h = img.offsetHeight;
      var x = img.offsetLeft, y = img.offsetTop, p = img.offsetParent;
      while (p && p !== sheet) { x += p.offsetLeft; y += p.offsetTop; p = p.offsetParent; }
      if (!anim || still()) sel.style.transition = "none";
      sel.style.width = (w + 2 * pad) + "px";
      sel.style.height = (h + 2 * pad) + "px";
      sel.style.borderRadius = (w * 0.125 + pad) + "px / " + (h * 0.0575 + pad) + "px";
      sel.style.transform = "translate(" + (x - pad) + "px," + (y - pad) + "px)";
      if (!anim || still()) { void sel.offsetWidth; sel.style.transition = ""; }
    }
    function warm(i) {
      if (warmed[i]) return;
      warmed[i] = new Image();
      warmed[i].src = thumbs[i].getAttribute("href");
    }
    function pick(i) {
      if (i === cur) return;
      var dir = i > cur ? 1 : -1;
      cur = i;
      thumbs.forEach(function (a, j) { a.setAttribute("aria-pressed", j === i ? "true" : "false"); });
      place(true);
      var t = $("img", thumbs[i]);
      var next = document.createElement("img");
      next.width = 800; next.height = 1739;
      next.alt = t.alt;
      next.decoding = "async";
      next.src = thumbs[i].getAttribute("href");
      cap.textContent = $("span", thumbs[i]).textContent;
      if (!still() && cap.animate) cap.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 560, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      function finish() {
        next.style.clipPath = "";
        // everything under the newest screen can go
        while (next.previousElementSibling && next.previousElementSibling.tagName === "IMG") lp.removeChild(next.previousElementSibling);
      }
      function go() {
        if (still()) { lp.appendChild(next); finish(); return; }
        next.style.clipPath = dir > 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)";
        lp.appendChild(next);
        tween(760, EIO, function (e) {
          var r = ((1 - e) * 100).toFixed(2) + "%";
          next.style.clipPath = dir > 0 ? "inset(0 0 " + r + " 0)" : "inset(" + r + " 0 0 0)";
        }, finish);
      }
      var d = next.decode ? next.decode() : null;
      if (d && d.then) d.then(go, go); else go();
    }
    thumbs.forEach(function (a, i) {
      a.setAttribute("role", "button");
      a.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      a.setAttribute("aria-controls", "ar-loupe");
      a.addEventListener("click", function (ev) { ev.preventDefault(); pick(i); });
      a.addEventListener("keydown", function (ev) { if (ev.key === " ") { ev.preventDefault(); pick(i); } });
      a.addEventListener("pointerenter", function () { warm(i); });
      a.addEventListener("focus", function () { warm(i); });
    });
    place(false);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(false); });
    window.addEventListener("load", function () { place(false); });
    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = later(120, function () { place(false); }); });
  })();

  /* ------------------------------------------------ 2. the copilot's limits, on the page's lines */
  var sc = $("[data-ar-sc]");
  if (sc && F) (function () {
    var curEl = $("[data-ar-cur]", sc), tag = $("[data-ar-tag]", sc);
    var UNIT = 1000, COPILOT = 100000, SECOND = 500000, MIN = 10, MAX = 1000000, REST = COPILOT;
    var LN = Math.log(10), SPAN = Math.log(1680) / LN + 2;
    function fx(r) { return F.gx(r / UNIT); }
    function rAt(f) { return UNIT * Math.pow(10, f * SPAN - 2); }
    // the detents are the page's own lines: m x 10^k, from 10 roubles to 1,000,000
    var stops = F.gridValues().filter(function (g) { return !g.end; }).map(function (g) { return Math.round(g.v * UNIT); });
    var st = { r: REST, f: fx(REST), stop: null, busy: false, cancel: false };
    var labels = {};
    ["1a", "1b", "2a", "2b"].forEach(function (k) { labels[k] = $$('[data-ar-l="' + k + '"]', sc); });

    function money(r) { return "₽" + F.fmtInt(r); }
    function nice(r) { var p = Math.pow(10, Math.floor(Math.log(r) / LN) - 1); return Math.round(r / p) * p; }
    function words(r) {
      var a = r <= COPILOT, b = r <= SECOND;
      return money(r) + (a ? ": the copilot may carry it out, after a yes" : ": more than the largest action the copilot may carry out") +
        (b ? "; a business payment this size needs one signature." : "; a business payment this size waits for a second signature.");
    }
    function light(r) {
      var a = r <= COPILOT, b = r <= SECOND;
      labels["1a"].forEach(function (t) { t.classList.toggle("is-on", a); });
      labels["1b"].forEach(function (t) { t.classList.toggle("is-on", !a); });
      labels["2a"].forEach(function (t) { t.classList.toggle("is-on", b); });
      labels["2b"].forEach(function (t) { t.classList.toggle("is-on", !b); });
    }
    function read(r) {
      tag.textContent = money(r);
      light(r);
      curEl.setAttribute("aria-valuenow", Math.round(r));
      curEl.setAttribute("aria-valuetext", words(r));
    }
    function pos(f) {
      st.f = f;
      sc.style.setProperty("--cx", (f * 100).toFixed(3) + "%");
      var W = sc.clientWidth, tw = tag.offsetWidth, x = f * W;
      var tx = Math.max(tw / 2 - x, Math.min(W - x - tw / 2, 0));
      tag.style.setProperty("--tx", tx.toFixed(1) + "px");
    }
    function clip(f) {
      var w = (Math.min(1, Math.max(0, f)) * 100).toFixed(3) + "%";
      $$(".ar-clip", sc).forEach(function (c) { c.setAttribute("width", w); });
    }
    function setR(r, anim) {
      st.r = r;
      read(r);
      var to = fx(r), from = st.f;
      if (st.stop) st.stop();
      if (!anim || still()) { pos(to); return; }
      st.stop = tween(220, EO, function (e) { pos(from + (to - from) * e); });
    }
    function nearest(r) {
      var best = stops[0], bd = Infinity, lr = Math.log(r);
      stops.forEach(function (s) { var d = Math.abs(Math.log(s) - lr); if (d < bd) { bd = d; best = s; } });
      return best;
    }

    /* the sweep, like a gauge's self-test: up the whole scale while the lanes
       are drawn, pausing at each rule, then back to the copilot's own limit */
    function sweep() {
      st.busy = true;
      var legs = [[MIN, COPILOT, 1300, EIO, 360], [COPILOT, SECOND, 700, EIO, 360], [SECOND, MAX, 520, EO, 520], [MAX, REST, 950, EIO, 0]];
      function leg(k) {
        if (st.cancel) return;
        if (k >= legs.length) { st.busy = false; st.stop = null; return; }
        var a = legs[k][0], b = legs[k][1], fa = fx(a), fb = fx(b), back = b < a;
        if (back) clip(1);
        st.stop = tween(legs[k][2], legs[k][3], function (e) {
          var f = fa + (fb - fa) * e;
          pos(f);
          if (!back) clip(f);
          var r = e >= 1 ? b : nice(rAt(f));
          st.r = r;
          read(r);
        }, function () {
          if (k === 2) {
            // the last stretch of the lanes, past the end of the cursor's travel
            var c0 = fb;
            tween(legs[k][4], EO, function (e) { clip(c0 + (1 - c0) * e); });
          }
          later(legs[k][4], function () { leg(k + 1); });
        });
      }
      leg(0);
    }
    function interrupt() {
      if (!st.busy) return;
      st.cancel = true;
      if (st.stop) st.stop();
      st.busy = false;
      clip(1);
    }

    curEl.setAttribute("aria-valuemin", MIN);
    curEl.setAttribute("aria-valuemax", MAX);
    sc.classList.add("is-live");
    if (still()) { clip(1); setR(REST, false); }
    else if (sc.classList.contains("in")) { clip(1); setR(REST, false); }
    else {
      clip(0);
      setR(MIN, false);
      RP.watch(sc, function () { later(420, sweep); });
    }

    var dragging = false;
    function rFromEvent(ev) {
      var rect = sc.getBoundingClientRect();
      return nearest(rAt(Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))));
    }
    sc.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      interrupt();
      dragging = true;
      try { sc.setPointerCapture(ev.pointerId); } catch (e) {}
      setR(rFromEvent(ev), true);
    });
    sc.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var r = rFromEvent(ev);
      if (r !== st.r) setR(r, true);
    });
    function end() { dragging = false; }
    sc.addEventListener("pointerup", end);
    sc.addEventListener("pointercancel", end);
    curEl.addEventListener("keydown", function (ev) {
      var i = stops.indexOf(nearest(st.r)), j = i;
      if (ev.key === "ArrowRight" || ev.key === "ArrowUp") j = i + 1;
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") j = i - 1;
      else if (ev.key === "PageUp") j = i + 9;
      else if (ev.key === "PageDown") j = i - 9;
      else if (ev.key === "Home") j = 0;
      else if (ev.key === "End") j = stops.length - 1;
      else return;
      ev.preventDefault();
      interrupt();
      setR(stops[Math.max(0, Math.min(stops.length - 1, j))], false);
    });
    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = later(120, function () { pos(st.f); }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { pos(st.f); });
  })();

  /* ------------------------------------------------ 3. the credit screen, read in the order the chapter tells it */
  var cr = $("[data-ar-cr]");
  if (cr) (function () {
    var spot = $("[data-ar-spot]", cr), ph = $("[data-ar-cr-ph]", cr), items = $$("[data-ar-r]", cr);
    var seq = false, on = -1;
    function band(li) {
      return { t: parseFloat(li.style.getPropertyValue("--t")), h: parseFloat(li.style.getPropertyValue("--h")) };
    }
    function light(i) {
      if (i === on) return;
      on = i;
      items.forEach(function (li, j) { li.classList.toggle("is-on", j === i); });
      if (i < 0) { cr.removeAttribute("data-on"); return; }
      var b = band(items[i]);
      spot.style.top = (b.t - 0.6) + "%";
      spot.style.height = (b.h + 1.2) + "%";
      cr.setAttribute("data-on", String(i));
    }
    items.forEach(function (li, i) {
      li.tabIndex = 0;
      li.addEventListener("pointerenter", function () { if (!seq) light(i); });
      li.addEventListener("pointerleave", function () { if (!seq) light(-1); });
      li.addEventListener("focus", function () { seq = false; light(i); });
      li.addEventListener("blur", function () { light(-1); });
    });
    ph.addEventListener("pointermove", function (ev) {
      if (seq || ev.pointerType === "touch") return;
      var r = ph.getBoundingClientRect(), y = (ev.clientY - r.top) / r.height * 100, hit = -1;
      items.forEach(function (li, j) { var b = band(li); if (y >= b.t && y <= b.t + b.h) hit = j; });
      light(hit);
    });
    ph.addEventListener("pointerleave", function () { if (!seq) light(-1); });
    onIn(cr, function () {
      if (still()) return;
      seq = true;
      [[350, 0], [1450, 1], [2550, 2], [4100, -1]].forEach(function (s) {
        later(s[0], function () { if (seq) light(s[1]); if (s[1] < 0) seq = false; });
      });
    });
  })();
})();
