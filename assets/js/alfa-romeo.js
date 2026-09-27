/* Alfa-Romeo: the two loops and their indexes, the rouble scale and the
   credit screen. Enhances markup that is complete without it: with
   JavaScript off each phone shows its first screen and its index is a plain
   list, the scale is drawn whole, and the brackets stand beside the credit
   screen. */
(function () {
  "use strict";
  var RP = window.RP, A = window.ArFig;
  if (!RP) return;
  var still = RP.still, tween = RP.tween, EO = RP.EO, EIO = RP.EIO;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function later(ms, fn) { return setTimeout(fn, ms); }
  /* run fn once el is in view; site.js may already have seen it */
  function onIn(el, fn) { if (el.classList.contains("in")) fn(); else RP.watch(el, fn); }

  /* ------------------------------------------------ 1. each loop's index follows it, and stops it on a pick */
  $$("[data-ar-idx]").forEach(function (idx) {
    var v = document.getElementById(idx.getAttribute("data-v"));
    var lis = $$(".ar-steps li", idx);
    if (!v || !lis.length) return;
    var len = parseFloat(idx.getAttribute("data-len"));
    var at = lis.map(function (li) { return parseFloat(li.getAttribute("data-at")); });
    var go = lis.map(function (li) { return parseFloat(li.getAttribute("data-go")); });
    var first = Math.min.apply(null, at);
    var tog = null, cur = -1, raf = 0;

    // the screen on at time t: the latest start at or before it, wrapping round the loop
    function segOf(t) {
      var best = -1, bt = -Infinity;
      at.forEach(function (a, i) { if (a <= t && a > bt) { bt = a; best = i; } });
      if (best < 0) at.forEach(function (a, i) { if (a > bt) { bt = a; best = i; } });
      return best;
    }
    function span(i) {
      var a = at[i], nxt = Infinity;
      at.forEach(function (b) { if (b > a && b < nxt) nxt = b; });
      if (nxt === Infinity) nxt = first + len;
      return [a, nxt - a];
    }
    function paint() {
      var t = v.currentTime || 0, i = segOf(t), p = 1;
      if (!v.paused) {
        var sp = span(i), d = t - sp[0];
        if (d < 0) d += len;
        p = Math.max(0, Math.min(1, d / sp[1]));
      }
      if (i !== cur) {
        lis.forEach(function (li, j) {
          li.classList.toggle("is-on", j === i);
          if (j !== i) li.style.setProperty("--p", "0");
          var b = li.firstElementChild;
          if (b) { if (j === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); }
        });
        cur = i;
      }
      lis[i].style.setProperty("--p", p.toFixed(4));
    }
    function loop() { paint(); raf = v.paused ? 0 : requestAnimationFrame(loop); }
    function pick(i) {
      v.dataset.held = "1";
      v.pause();
      if (tog) { tog.textContent = "Play"; tog.setAttribute("aria-label", "Play the video"); }
      if (v.preload !== "auto") v.preload = "auto";
      try { v.currentTime = go[i]; } catch (e) {}
      paint();
    }

    lis.forEach(function (li, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ar-step";
      b.textContent = li.textContent;
      b.setAttribute("aria-controls", v.id);
      li.textContent = "";
      li.appendChild(b);
      b.addEventListener("click", function () { pick(i); });
    });
    // the loop's own pause goes into the head of its index, beside its name
    tog = v.parentElement.querySelector(".vid-toggle");
    var head = $(".ar-idx-h", idx);
    if (tog && head) head.appendChild(tog);

    v.addEventListener("play", function () { if (!raf) raf = requestAnimationFrame(loop); });
    ["pause", "seeked", "loadeddata"].forEach(function (e) { v.addEventListener(e, paint); });
    paint();
  });

  /* ------------------------------------------------ 2. the copilot's limits, on a rouble scale */
  var sc = $("[data-ar-sc]");
  if (sc && A) (function () {
    var curEl = $("[data-ar-cur]", sc), tag = $("[data-ar-tag]", sc);
    var COPILOT = A.COPILOT, SECOND = A.SECOND, MIN = A.LO, MAX = A.HI, REST = COPILOT;
    var fx = A.fx, rAt = A.rAt, stops = A.stops(), LN = Math.log(10);
    var st = { r: REST, f: fx(REST), stop: null, busy: false, cancel: false };
    var labels = {};
    ["1a", "1b", "2a", "2b"].forEach(function (k) { labels[k] = $$('[data-ar-l="' + k + '"]', sc); });

    function money(r) { return "₽" + A.fmt(r); }
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
      var legs = [[MIN, COPILOT, 1300, EIO, 360], [COPILOT, SECOND, 700, EIO, 360], [SECOND, MAX, 520, EO, 420], [MAX, REST, 950, EIO, 0]];
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
        }, function () { later(legs[k][4], function () { leg(k + 1); }); });
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
    if (still() || sc.classList.contains("in")) { clip(1); setR(REST, false); }
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
      sc.classList.add("is-drag");
      try { sc.setPointerCapture(ev.pointerId); } catch (e) {}
      setR(rFromEvent(ev), true);
    });
    sc.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var r = rFromEvent(ev);
      if (r !== st.r) setR(r, true);
    });
    function end() { dragging = false; sc.classList.remove("is-drag"); }
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
